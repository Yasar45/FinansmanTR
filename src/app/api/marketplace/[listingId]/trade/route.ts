import { NextResponse } from 'next/server';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  MarketplaceListingStatus,
  WalletTransactionType,
  AnimalStatus,
  PlotStatus
} from '@prisma/client';
import { loadEconomySettings } from '@/lib/economy';
import { calculateMarketplaceFees, resolveOutputKind } from '@/lib/marketplace';

const tradeSchema = z.object({
  qty: z.number().positive().optional()
});

export async function POST(request: Request, { params }: { params: { listingId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const listing = await prisma.marketplaceListing.findUnique({ where: { id: params.listingId } });
  if (!listing || listing.status !== MarketplaceListingStatus.ACTIVE) {
    return NextResponse.json({ message: 'İlan uygun değil' }, { status: 409 });
  }

  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ message: 'Kendi ilanınızı satın alamazsınız' }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = tradeSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const listingQty = new Decimal(listing.qty);
  const qtyDecimal = parsed.data?.qty ? new Decimal(parsed.data.qty) : listingQty;
  if (qtyDecimal.gt(listingQty)) {
    return NextResponse.json({ message: 'Talep edilen miktar ilan miktarını aşıyor' }, { status: 400 });
  }

  const settings = await loadEconomySettings();
  const notional = new Decimal(listing.priceTRY).mul(qtyDecimal);
  const fees = calculateMarketplaceFees({
    notional,
    makerFeeBps: settings.pricing.marketplace.makerFeeBps,
    takerFeeBps: settings.pricing.marketplace.takerFeeBps
  });

  const buyerWallet = await prisma.wallet.findFirstOrThrow({ where: { userId: session.user.id } });
  const sellerWallet = await prisma.wallet.findFirstOrThrow({ where: { userId: listing.sellerId } });

  const buyerBalance = new Decimal(buyerWallet.balance);
  const buyerDebit = notional.add(fees.takerFee);

  if (buyerBalance.lt(buyerDebit)) {
    return NextResponse.json({ message: 'Yetersiz bakiye' }, { status: 422 });
  }

  const isFullFill = qtyDecimal.eq(listingQty);

  const result = await prisma.$transaction(async (tx) => {
    const updatedListing = await tx.marketplaceListing.update({
      where: { id: listing.id },
      data: {
        status: isFullFill ? MarketplaceListingStatus.FILLED : MarketplaceListingStatus.ACTIVE,
        qty: isFullFill ? 0 : listingQty.minus(qtyDecimal).toNumber()
      }
    });

    const order = await tx.order.create({
      data: {
        listingId: listing.id,
        makerId: listing.sellerId,
        takerId: session.user.id,
        priceTRY: listing.priceTRY,
        qty: qtyDecimal.toNumber(),
        feesTRY: fees.makerFee.toNumber()
      }
    });

    const trade = await tx.trade.create({
      data: {
        orderId: order.id,
        takerId: session.user.id,
        priceTRY: listing.priceTRY,
        qty: qtyDecimal.toNumber(),
        feesTRY: fees.takerFee.toNumber()
      }
    });

    const buyerWalletUpdate = await tx.wallet.update({
      where: { id: buyerWallet.id },
      data: { balance: buyerBalance.minus(buyerDebit).toNumber() }
    });

    const sellerWalletUpdate = await tx.wallet.update({
      where: { id: sellerWallet.id },
      data: { balance: new Decimal(sellerWallet.balance).add(notional).sub(fees.makerFee).toNumber() }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: buyerWallet.id,
        type: WalletTransactionType.MARKET_TRADE,
        amount: buyerDebit.mul(-1).toNumber(),
        balance: buyerWalletUpdate.balance,
        metadata: {
          listingId: listing.id,
          qty: qtyDecimal.toNumber(),
          makerFee: fees.makerFee.toNumber(),
          takerFee: fees.takerFee.toNumber(),
          side: 'BUY'
        }
      }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: sellerWallet.id,
        type: WalletTransactionType.MARKET_TRADE,
        amount: notional.sub(fees.makerFee).toNumber(),
        balance: sellerWalletUpdate.balance,
        metadata: {
          listingId: listing.id,
          qty: qtyDecimal.toNumber(),
          side: 'SELL'
        }
      }
    });

    if (listing.assetRef === 'OUTPUT' && listing.symbol) {
      const kind = resolveOutputKind(listing.symbol as any);
      const currentInventory = await tx.outputInventory.findUnique({
        where: { ownerId_kind: { ownerId: session.user.id, kind } }
      });
      if (currentInventory) {
        const currentQty = new Decimal(currentInventory.qty);
        const nextQty = currentQty.add(qtyDecimal);
        const currentCost = new Decimal(currentInventory.avgCostTRY).mul(currentQty);
        const nextAvg = nextQty.isZero()
          ? new Decimal(0)
          : currentCost.add(notional).div(nextQty);
        await tx.outputInventory.update({
          where: { id: currentInventory.id },
          data: { qty: nextQty.toNumber(), avgCostTRY: nextAvg.toNumber() }
        });
      } else {
        await tx.outputInventory.create({
          data: {
            ownerId: session.user.id,
            kind,
            qty: qtyDecimal.toNumber(),
            unit: 'unit',
            avgCostTRY: notional.div(qtyDecimal).toNumber()
          }
        });
      }
    }

    if (listing.assetRef === 'ANIMAL' && listing.refId) {
      await tx.animal.update({
        where: { id: listing.refId },
        data: { ownerId: session.user.id, status: AnimalStatus.ACTIVE }
      });
    }

    if (listing.assetRef === 'PLOT' && listing.refId) {
      await tx.plot.update({ where: { id: listing.refId }, data: { ownerId: session.user.id, status: PlotStatus.ACTIVE } });
    }

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'marketplace.trade.execute',
        entity: `MarketplaceListing:${listing.id}`,
        before: listing,
        after: updatedListing
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'marketplace.trade.funds',
        entity: `Order:${order.id}`,
        before: null,
        after: {
          notional: notional.toNumber(),
          makerFee: fees.makerFee.toNumber(),
          takerFee: fees.takerFee.toNumber()
        }
      }
    });

    return { listing: updatedListing, order, trade };
  });

  return NextResponse.json({
    listing: result.listing,
    order: result.order,
    trade: result.trade
  });
}
