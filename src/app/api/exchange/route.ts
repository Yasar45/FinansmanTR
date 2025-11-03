import { NextResponse } from 'next/server';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WalletTransactionType } from '@prisma/client';
import { buildExchangePreview, EXCHANGE_SYMBOLS, loadEconomySettings, type ExchangeSymbol } from '@/lib/economy';
import { resolveOutputKind } from '@/lib/marketplace';

const tradeSchema = z.object({
  symbol: z.enum(EXCHANGE_SYMBOLS),
  side: z.enum(['BUY', 'SELL']),
  qty: z.number().positive()
});

const previewSchema = z.object({
  symbol: z.enum(EXCHANGE_SYMBOLS),
  side: z.enum(['BUY', 'SELL']),
  qty: z.number().positive()
});

export async function GET(request: Request) {
  const prices = await prisma.systemPrice.findMany({ orderBy: { symbol: 'asc' } });
  const formatted = prices.map((price) => {
    const buyPreview = buildExchangePreview({
      mid: price.midPriceTRY,
      spreadBps: price.spreadBps,
      qty: 1,
      side: 'BUY',
      feeBps: 0
    });
    const sellPreview = buildExchangePreview({
      mid: price.midPriceTRY,
      spreadBps: price.spreadBps,
      qty: 1,
      side: 'SELL',
      feeBps: 0
    });
    return {
      symbol: price.symbol,
      midPriceTRY: price.midPriceTRY,
      spreadBps: price.spreadBps,
      source: price.source,
      lastUpdatedAt: price.lastUpdatedAt,
      buyTRY: buyPreview.price.toNumber(),
      sellTRY: sellPreview.price.toNumber()
    };
  });

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const side = searchParams.get('side');
  const qtyParam = searchParams.get('qty');

  if (symbol && side && qtyParam) {
    const parsed = previewSchema.safeParse({ symbol, side, qty: Number(qtyParam) });
    if (parsed.success) {
      const target = prices.find((p) => p.symbol === parsed.data.symbol);
      if (!target) {
        return NextResponse.json({ prices: formatted }, { status: 200 });
      }
      const preview = buildExchangePreview({
        mid: target.midPriceTRY,
        spreadBps: target.spreadBps,
        qty: parsed.data.qty,
        side: parsed.data.side
      });
      return NextResponse.json({ prices: formatted, preview });
    }
  }

  return NextResponse.json({ prices: formatted });
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

  const [price, wallet, settings] = await Promise.all([
    prisma.systemPrice.findUniqueOrThrow({ where: { symbol: parsed.data.symbol } }),
    prisma.wallet.findFirstOrThrow({ where: { userId: session.user.id } }),
    loadEconomySettings()
  ]);

  const preview = buildExchangePreview({
    mid: price.midPriceTRY,
    spreadBps: price.spreadBps,
    qty: parsed.data.qty,
    side: parsed.data.side,
    feeBps: settings.pricing.exchange.tradeFeeBps
  });

  const currentBalance = new Decimal(wallet.balance);
  const requiredBalance = parsed.data.side === 'BUY' ? preview.notional.add(preview.fee) : new Decimal(0);

  if (parsed.data.side === 'BUY' && currentBalance.lt(requiredBalance)) {
    return NextResponse.json({ message: 'Yetersiz bakiye' }, { status: 422 });
  }

  const qtyDecimal = new Decimal(parsed.data.qty);
  const notional = preview.price.mul(qtyDecimal);
  const fee = preview.fee;
  const totalDebit = parsed.data.side === 'BUY' ? notional.add(fee) : fee;
  const outputKind = resolveOutputKind(parsed.data.symbol as ExchangeSymbol);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const walletUpdate = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance:
            parsed.data.side === 'BUY'
              ? currentBalance.minus(notional).minus(fee).toNumber()
              : currentBalance.add(notional).minus(fee).toNumber()
        }
      });

      const inventory = await tx.outputInventory.upsert({
        where: { ownerId_kind: { ownerId: session.user.id, kind: outputKind } },
        update: {},
        create: { ownerId: session.user.id, kind: outputKind, qty: 0, unit: 'unit', avgCostTRY: 0 }
      });

      const currentQty = new Decimal(inventory.qty);
      const currentCost = new Decimal(inventory.avgCostTRY).mul(currentQty);

      let nextQty: Decimal;
      let nextAvgCost: Decimal;

      if (parsed.data.side === 'BUY') {
        nextQty = currentQty.add(qtyDecimal);
        const newCost = currentCost.add(notional).add(fee);
        nextAvgCost = nextQty.isZero() ? new Decimal(0) : newCost.div(nextQty);
      } else {
        if (currentQty.lt(qtyDecimal)) {
          throw new Error('Insufficient inventory');
        }
        nextQty = currentQty.sub(qtyDecimal);
        const avgCost = new Decimal(inventory.avgCostTRY);
        const newCost = currentCost.sub(avgCost.mul(qtyDecimal));
        nextAvgCost = nextQty.isZero() ? new Decimal(0) : newCost.div(nextQty);
      }

      await tx.outputInventory.update({
        where: { id: inventory.id },
        data: { qty: nextQty.toNumber(), avgCostTRY: nextAvgCost.toNumber() }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.EXCHANGE_TRADE,
          amount: parsed.data.side === 'BUY' ? notional.mul(-1).sub(fee).toNumber() : notional.sub(fee).toNumber(),
          balance: walletUpdate.balance,
          metadata: {
            symbol: parsed.data.symbol,
            qty: parsed.data.qty,
            side: parsed.data.side,
            fee: fee.toNumber(),
            price: preview.price.toNumber()
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: 'exchange.trade',
          entity: `SystemPrice:${price.symbol}`,
          before: null,
          after: {
            side: parsed.data.side,
            qty: parsed.data.qty,
            price: preview.price.toNumber(),
            fee: fee.toNumber(),
            totalDebit: totalDebit.toNumber()
          }
        }
      });

      return { wallet: walletUpdate };
    });

    return NextResponse.json({
      wallet: result.wallet,
      trade: {
        symbol: parsed.data.symbol,
        price: preview.price.toNumber(),
        qty: parsed.data.qty,
        side: parsed.data.side,
        fee: fee.toNumber(),
        notional: notional.toNumber(),
        slippage: preview.slippage.toNumber()
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient inventory') {
      return NextResponse.json({ message: 'Yetersiz stok' }, { status: 422 });
    }
    throw error;
  }
}
