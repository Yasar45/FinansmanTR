import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPaymentProvider, type PaymentProviderName } from '@/lib/clients/payments';
import { PaymentIntentStatus, PaymentProviderType, WalletTransactionType } from '@prisma/client';
import { env } from '@/lib/env';
import { assertLedgerConsistency } from '@/lib/wallet';

const depositSchema = z.object({
  amount: z.number().positive(),
  provider: z.enum(['MOCK', 'IYZICO', 'PAYTR']).default(env.PAYMENT_PROVIDER),
  reference: z.string().min(3),
  metadata: z.record(z.unknown()).optional()
});

const providerEnumMap: Record<PaymentProviderName, PaymentProviderType> = {
  MOCK: PaymentProviderType.MOCK,
  IYZICO: PaymentProviderType.IYZICO,
  PAYTR: PaymentProviderType.PAYTR
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const wallet = await prisma.wallet.findFirst({
    where: { userId: session.user.id },
    include: {
      ledger: { orderBy: { createdAt: 'desc' }, take: 20 },
      withdrawalRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
      paymentIntents: { orderBy: { createdAt: 'desc' }, take: 5 }
    }
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

  const minuteAgo = new Date(Date.now() - 60 * 1000);
  const depositsLastMinute = await prisma.paymentIntent.count({
    where: { userId: session.user.id, createdAt: { gte: minuteAgo } }
  });
  if (depositsLastMinute >= env.PAYMENT_MAX_DEPOSITS_PER_MINUTE) {
    return NextResponse.json(
      { message: 'Dakikalık para yatırma sınırına ulaşıldı.' },
      { status: 429 }
    );
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentDeposits = await prisma.paymentIntent.count({
    where: { userId: session.user.id, createdAt: { gte: hourAgo } }
  });
  if (recentDeposits >= env.PAYMENT_MAX_DEPOSITS_PER_HOUR) {
    return NextResponse.json(
      { message: 'Saatlik para yatırma sınırına ulaşıldı.' },
      { status: 429 }
    );
  }

  const velocity = await prisma.paymentIntent.aggregate({
    _sum: { amount: true },
    where: { userId: session.user.id, createdAt: { gte: hourAgo } }
  });
  const velocitySum = Number(velocity._sum.amount ?? 0);
  if (velocitySum + parsed.data.amount > env.PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR) {
    return NextResponse.json(
      { message: 'Saatlik para yatırma limiti aşılıyor.' },
      { status: 429 }
    );
  }

  const providerName = parsed.data.provider as PaymentProviderName;
  const provider = getPaymentProvider(providerName);

  const checkout = await provider.createCheckout({
    amountTRY: parsed.data.amount,
    reference: parsed.data.reference,
    userId: session.user.id,
    metadata: parsed.data.metadata
  });

  const intentMetadata = {
    reference: parsed.data.reference,
    provider: provider.name,
    request: parsed.data.metadata ?? {},
    checkout: checkout.raw ?? null
  };

  const intent = await prisma.paymentIntent.create({
    data: {
      userId: session.user.id,
      walletId: wallet.id,
      provider: providerEnumMap[provider.name as PaymentProviderName],
      amount: parsed.data.amount,
      status: PaymentIntentStatus.PENDING,
      reference: checkout.checkoutId,
      checkoutUrl: checkout.checkoutUrl,
      metadata: intentMetadata
    }
  });

  let updatedWallet = wallet;
  let updatedIntent = intent;

  if (provider.name === 'MOCK') {
    const capture = await provider.capture(checkout.checkoutId);
    if (capture.status === 'FAILED') {
      updatedIntent = await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: PaymentIntentStatus.FAILED, metadata: { ...intentMetadata, capture } }
      });
      return NextResponse.json({
        paymentIntent: updatedIntent,
        checkout
      });
    }

    updatedWallet = await prisma.$transaction(async (tx) => {
      const capturedIntent = await tx.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: capture.status === 'SETTLED' ? PaymentIntentStatus.SETTLED : PaymentIntentStatus.AUTHORIZED,
          capturedAt: new Date(),
          metadata: { ...intentMetadata, capture }
        }
      });

      updatedIntent = capturedIntent;

      const newBalance = Number(wallet.balance) + parsed.data.amount;
      const walletRecord = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance }
      });

      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEPOSIT,
          amount: parsed.data.amount,
          balance: walletRecord.balance,
          paymentIntentId: capturedIntent.id,
          metadata: {
            provider: provider.name,
            reference: capture.reference,
            status: capture.status
          }
        }
      });

      assertLedgerConsistency({
        openingBalance: wallet.balance,
        currentBalance: walletRecord.balance,
        entries: [{ amount: ledgerEntry.amount, balance: ledgerEntry.balance }]
      });

      return walletRecord;
    });
  }

  return NextResponse.json({
    wallet: updatedWallet,
    paymentIntent: updatedIntent,
    checkout
  });
}
