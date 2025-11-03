import { NextResponse } from 'next/server';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MarketplaceListingStatus, AnimalStatus, PlotStatus } from '@prisma/client';
import { loadEconomySettings, projectROI } from '@/lib/economy';
import {
  MARKETPLACE_ASSET_REFS,
  assertPriceGuardrails,
  canCreateListingToday,
  calculateMarketplaceFees,
  resolveOutputKind
} from '@/lib/marketplace';

const filtersSchema = z.object({
  assetRef: z.enum(MARKETPLACE_ASSET_REFS).optional(),
  symbol: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional()
});

const createListingSchema = z.object({
  assetRef: z.enum(MARKETPLACE_ASSET_REFS),
  refId: z.string().min(3).optional(),
  symbol: z.string().optional(),
  priceTRY: z.number().positive(),
  qty: z.number().positive(),
  expiresAt: z.string().datetime().optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedFilters = filtersSchema.safeParse({
    assetRef: searchParams.get('assetRef') ?? undefined,
    symbol: searchParams.get('symbol') ?? undefined,
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined
  });

  if (!parsedFilters.success) {
    return NextResponse.json(parsedFilters.error.format(), { status: 400 });
  }

  const where: any = {
    status: MarketplaceListingStatus.ACTIVE
  };

  if (parsedFilters.data.assetRef) {
    where.assetRef = parsedFilters.data.assetRef;
  }
  if (parsedFilters.data.symbol) {
    where.symbol = parsedFilters.data.symbol;
  }
  if (parsedFilters.data.minPrice || parsedFilters.data.maxPrice) {
    where.priceTRY = {};
    if (parsedFilters.data.minPrice) {
      where.priceTRY.gte = parsedFilters.data.minPrice;
    }
    if (parsedFilters.data.maxPrice) {
      where.priceTRY.lte = parsedFilters.data.maxPrice;
    }
  }

  const listings = await prisma.marketplaceListing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const animalIds = listings.filter((l) => l.assetRef === 'ANIMAL').map((l) => l.refId);
  const plotIds = listings.filter((l) => l.assetRef === 'PLOT').map((l) => l.refId);

  const [animals, plots, settings] = await Promise.all([
    animalIds.length
      ? prisma.animal.findMany({
          where: { id: { in: animalIds } },
          include: { type: { include: { feedType: true } } }
        })
      : Promise.resolve([]),
    plotIds.length
      ? prisma.plot.findMany({
          where: { id: { in: plotIds } },
          include: { cropType: true }
        })
      : Promise.resolve([]),
    loadEconomySettings()
  ]);

  const animalsById = new Map(animals.map((animal) => [animal.id, animal]));
  const plotsById = new Map(plots.map((plot) => [plot.id, plot]));

  const enriched = listings.map((listing) => {
    let roi: number | null = null;
    let feedCostPerDay: number | null = null;
    let nextHarvestAt: Date | null = null;

    if (listing.assetRef === 'ANIMAL') {
      const animal = animalsById.get(listing.refId);
      if (animal) {
        const productivity = new Decimal(animal.type.baseSellPriceTRY).mul(animal.productivityMod ?? 1);
        const expectedRevenue = productivity.mul(30);
        const feedCost = new Decimal(animal.type.feedPerTick ?? 0).mul(animal.type.feedType?.unitCostTRY ?? 0);
        feedCostPerDay = feedCost.toNumber();
        const costs30d = feedCost.mul(30);
        roi = projectROI({
          expectedRevenue30d: expectedRevenue,
          expectedCosts30d: costs30d,
          assetCost: listing.priceTRY
        }).toNumber();
      }
    }

    if (listing.assetRef === 'PLOT') {
      const plot = plotsById.get(listing.refId);
      if (plot) {
        const cycleDays = plot.cropType?.cycleDays ?? 30;
        const expectedRevenue = new Decimal(plot.cropType?.baseSellPriceTRY ?? 0).mul(
          plot.cropType?.yieldPerCycle ?? 0
        );
        const maintenance = new Decimal(plot.maintenanceTRY ?? 0).mul(30);
        roi = projectROI({
          expectedRevenue30d: expectedRevenue,
          expectedCosts30d: maintenance,
          assetCost: listing.priceTRY
        }).toNumber();
        nextHarvestAt = plot.cropType ? new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000) : null;
      }
    }

    return {
      ...listing,
      metrics: {
        roi,
        feedCostPerDay,
        nextHarvestAt
      }
    };
  });

  return NextResponse.json({ listings: enriched, pricing: settings.pricing.marketplace });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const parsed = createListingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const settings = await loadEconomySettings();

  if (settings.pricing.marketplace.dailyListingLimit > 0) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const createdToday = await prisma.marketplaceListing.count({
      where: { sellerId: session.user.id, createdAt: { gte: startOfDay } }
    });
    try {
      canCreateListingToday({
        createdToday,
        dailyLimit: settings.pricing.marketplace.dailyListingLimit
      });
    } catch (error) {
      return NextResponse.json({ message: 'Günlük ilan limitine ulaşıldı' }, { status: 429 });
    }
  }

  if (parsed.data.symbol) {
    assertPriceGuardrails({
      symbol: parsed.data.symbol,
      price: parsed.data.priceTRY,
      floorPrices: settings.pricing.marketplace.floorPrices,
      ceilingPrices: settings.pricing.marketplace.ceilingPrices
    });
  }

  const now = new Date();
  const cooldownHours = settings.pricing.marketplace.relistCooldownHours;
  if (cooldownHours > 0 && parsed.data.refId) {
    const recentListing = await prisma.marketplaceListing.findFirst({
      where: {
        sellerId: session.user.id,
        assetRef: parsed.data.assetRef,
        refId: parsed.data.refId,
        createdAt: { gte: new Date(now.getTime() - cooldownHours * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (recentListing) {
      return NextResponse.json({ message: 'İlan için bekleme süresi devam ediyor' }, { status: 429 });
    }
  }

  const qty = new Decimal(parsed.data.qty);
  const price = new Decimal(parsed.data.priceTRY);
  const notional = qty.mul(price);
  const fees = calculateMarketplaceFees({
    notional,
    makerFeeBps: settings.pricing.marketplace.makerFeeBps,
    takerFeeBps: settings.pricing.marketplace.takerFeeBps
  });

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

  if (parsed.data.assetRef === 'OUTPUT') {
    if (!parsed.data.symbol) {
      return NextResponse.json({ message: 'Çıkış sembolü gerekli' }, { status: 400 });
    }
    const kind = resolveOutputKind(parsed.data.symbol as any);
    const inventory = await prisma.outputInventory.findUnique({
      where: { ownerId_kind: { ownerId: session.user.id, kind } }
    });
    if (!inventory || new Decimal(inventory.qty).lt(qty)) {
      return NextResponse.json({ message: 'Yetersiz envanter' }, { status: 422 });
    }
  }

  if (parsed.data.assetRef === 'ANIMAL') {
    if (!parsed.data.refId) {
      return NextResponse.json({ message: 'Hayvan kimliği gerekli' }, { status: 400 });
    }
    const animal = await prisma.animal.findUnique({ where: { id: parsed.data.refId } });
    if (!animal || animal.ownerId !== session.user.id) {
      return NextResponse.json({ message: 'Varlığa erişim yok' }, { status: 403 });
    }
    await prisma.animal.update({
      where: { id: animal.id },
      data: { status: AnimalStatus.STALLED }
    });
  }

  if (parsed.data.assetRef === 'PLOT') {
    if (!parsed.data.refId) {
      return NextResponse.json({ message: 'Parsel kimliği gerekli' }, { status: 400 });
    }
    const plot = await prisma.plot.findUnique({ where: { id: parsed.data.refId } });
    if (!plot || plot.ownerId !== session.user.id) {
      return NextResponse.json({ message: 'Varlığa erişim yok' }, { status: 403 });
    }
    await prisma.plot.update({ where: { id: plot.id }, data: { status: PlotStatus.SUSPENDED } });
  }

  const listing = await prisma.$transaction(async (tx) => {
    const created = await tx.marketplaceListing.create({
      data: {
        sellerId: session.user.id,
        assetRef: parsed.data.assetRef,
        refId: parsed.data.refId ?? randomUUID(),
        symbol: parsed.data.symbol,
        priceTRY: parsed.data.priceTRY,
        qty: parsed.data.qty,
        metadata: {
          makerFee: fees.makerFee.toNumber(),
          takerFee: fees.takerFee.toNumber()
        },
        status: MarketplaceListingStatus.ACTIVE,
        expiresAt
      }
    });

    if (parsed.data.assetRef === 'OUTPUT' && parsed.data.symbol) {
      const kind = resolveOutputKind(parsed.data.symbol as any);
      await tx.outputInventory.update({
        where: { ownerId_kind: { ownerId: session.user.id, kind } },
        data: {
          qty: { decrement: parsed.data.qty }
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'marketplace.listing.create',
        entity: `MarketplaceListing:${created.id}`,
        before: null,
        after: created
      }
    });

    return created;
  });

  return NextResponse.json(listing);
}
