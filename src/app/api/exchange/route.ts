import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WalletTransactionType } from '@prisma/client';

const tradeSchema = z.object({
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  qty: z.number().positive()
});

export async function GET() {
  const prices = await prisma.systemPrice.findMany({ orderBy: { symbol: 'asc' } });
  return NextResponse.json(prices);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const parsed = tradeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const price = await prisma.systemPrice.findUniqueOrThrow({ where: { symbol: parsed.data.symbol } });
  const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId: session.user.id } });

  const executionPrice = parsed.data.side === 'BUY' ? Number(price.sellTRY) : Number(price.buyTRY);
  const currentBalance = Number(wallet.balance);
  const notional = executionPrice * parsed.data.qty;

  if (parsed.data.side === 'BUY' && currentBalance < notional) {
    return NextResponse.json({ message: 'Yetersiz bakiye' }, { status: 422 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const newBalance = parsed.data.side === 'BUY' ? currentBalance - notional : currentBalance + notional;
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type:
          parsed.data.side === 'BUY'
            ? WalletTransactionType.EXCHANGE_TRADE
            : WalletTransactionType.SELL_ASSET,
        amount: parsed.data.side === 'BUY' ? -notional : notional,
        balance: updatedWallet.balance,
        metadata: { symbol: parsed.data.symbol, qty: parsed.data.qty, side: parsed.data.side }
      }
    });

    return { wallet: updatedWallet };
  });

  return NextResponse.json({
    ...result,
    trade: { price: executionPrice, qty: parsed.data.qty, side: parsed.data.side }
  });
}
