import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPaymentProvider, type PaymentProviderName } from '@/lib/clients/payments';
import { PaymentIntentStatus, WalletTransactionType } from '@prisma/client';
import { env } from '@/lib/env';

export async function POST(request: Request) {
  const providerHeader = (request.headers.get('x-payment-provider') ?? env.PAYMENT_PROVIDER) as PaymentProviderName;
  const signature = request.headers.get('x-payment-signature');
  const payload = await request.text();

  const provider = getPaymentProvider(providerHeader);
  const verified = await provider.webhookVerify(signature, payload);
  if (!verified) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let data: { reference?: string; status?: string; amountTRY?: number };
  try {
    data = JSON.parse(payload || '{}');
  } catch (error) {
    return NextResponse.json({ message: 'Invalid payload', error: String(error) }, { status: 400 });
  }

  if (!data.reference) {
    return NextResponse.json({ message: 'Missing payment reference' }, { status: 400 });
  }

  const intent = await prisma.paymentIntent.findUnique({ where: { reference: data.reference } });
  if (!intent) {
    return NextResponse.json({ message: 'Payment intent not found' }, { status: 404 });
  }

  if (intent.status === PaymentIntentStatus.SETTLED) {
    return NextResponse.json({ ok: true, status: 'ALREADY_SETTLED' });
  }

  const status = data.status ?? 'SETTLED';

  if (status === 'FAILED') {
    const updated = await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: PaymentIntentStatus.FAILED,
        metadata: { ...(intent.metadata ?? {}), webhook: data }
      }
    });
    return NextResponse.json({ ok: true, paymentIntent: updated });
  }

  const existingTx = await prisma.walletTransaction.findFirst({ where: { paymentIntentId: intent.id } });
  if (existingTx) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: PaymentIntentStatus.SETTLED,
        settledAt: existingTx.createdAt,
        metadata: { ...(intent.metadata ?? {}), webhook: data }
      }
    });
    return NextResponse.json({ ok: true, status: 'ALREADY_SETTLED' });
  }

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: intent.walletId } });

  const result = await prisma.$transaction(async (tx) => {
    const updatedIntent = await tx.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: PaymentIntentStatus.SETTLED,
        settledAt: new Date(),
        metadata: { ...(intent.metadata ?? {}), webhook: data }
      }
    });

    const balance = Number(wallet.balance) + Number(intent.amount);
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance }
    });

    const ledger = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEPOSIT,
        amount: Number(intent.amount),
        balance: updatedWallet.balance,
        paymentIntentId: intent.id,
        metadata: {
          provider: provider.name,
          status,
          webhook: data
        }
      }
    });

    return { paymentIntent: updatedIntent, wallet: updatedWallet, ledger };
  });

  return NextResponse.json({ ok: true, ...result });
}
