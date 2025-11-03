import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPaymentAdapter } from '@/lib/clients/payments';
import { WalletTransactionType } from '@prisma/client';

const depositSchema = z.object({
  amount: z.number().positive(),
  provider: z.enum(['iyzico', 'paytr']).default('iyzico'),
  reference: z.string().min(3)
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const wallet = await prisma.wallet.findFirst({
    where: { userId: session.user.id },
    include: { ledger: { orderBy: { createdAt: 'desc' }, take: 20 } }
  });

  return NextResponse.json(wallet);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const json = await request.json();
  const parsed = depositSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId: session.user.id } });
  const adapter = getPaymentAdapter(parsed.data.provider);

  const payment = await adapter.authorize({
    amount: parsed.data.amount,
    currency: 'TRY',
    reference: parsed.data.reference,
    customerId: session.user.id
  });

  if (payment.status === 'FAILED') {
    return NextResponse.json({ message: 'Payment failed', payment }, { status: 422 });
  }

  const currentBalance = Number(wallet.balance);
  const newBalance = currentBalance + parsed.data.amount;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEPOSIT,
        amount: parsed.data.amount,
        balance: updated.balance,
        metadata: { provider: parsed.data.provider, reference: parsed.data.reference }
      }
    });

    return updated;
  });

  return NextResponse.json({ wallet: result, payment });
}
