import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WithdrawalStatus, WalletTransactionType } from '@prisma/client';

const withdrawSchema = z.object({
  amount: z.number().positive(),
  iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i, 'Geçerli bir IBAN girin.'),
  reason: z.string().max(280).optional()
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const parsed = withdrawSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile || profile.kycStatus !== 'VERIFIED') {
    return NextResponse.json({ message: 'Çekim yapmak için KYC doğrulaması gerekli.' }, { status: 403 });
  }

  const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId: session.user.id } });
  const currentBalance = Number(wallet.balance);
  if (currentBalance < parsed.data.amount) {
    return NextResponse.json({ message: 'Yetersiz bakiye.' }, { status: 422 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: currentBalance - parsed.data.amount }
    });

    const withdrawal = await tx.withdrawalRequest.create({
      data: {
        userId: session.user.id,
        walletId: wallet.id,
        amount: parsed.data.amount,
        iban: parsed.data.iban.replace(/\s+/g, '').toUpperCase(),
        status: WithdrawalStatus.PENDING,
        reason: parsed.data.reason
      }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.WITHDRAW,
        amount: parsed.data.amount,
        balance: updatedWallet.balance,
        withdrawalRequestId: withdrawal.id,
        metadata: {
          status: 'LOCKED',
          iban: withdrawal.iban
        }
      }
    });

    return { withdrawal, wallet: updatedWallet };
  });

  return NextResponse.json(result);
}
