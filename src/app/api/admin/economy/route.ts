import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadEconomySettings } from '@/lib/economy';

const economySchema = z.object({
  tick: z.object({
    tickLengthMinutes: z.number().positive(),
    animalProductivityMultiplier: z.number().positive(),
    cropProductivityMultiplier: z.number().positive(),
    mortalityRateBps: z.number().nonnegative(),
    diseaseEvent: z
      .object({
        active: z.boolean(),
        penalty: z.number().min(0).max(1),
        affectedSeasonalityKeys: z.array(z.string()).optional()
      })
      .optional(),
    droughtEvent: z
      .object({
        active: z.boolean(),
        penalty: z.number().min(0).max(1)
      })
      .optional(),
    seasonality: z.record(z.string(), z.record(z.string(), z.number())).default({})
  }),
  pricing: z.object({
    exchange: z.object({ defaultSpreadBps: z.number().nonnegative() }),
    marketplace: z.object({
      makerFeeBps: z.number().nonnegative(),
      takerFeeBps: z.number().nonnegative(),
      floorPrices: z.record(z.string(), z.number()).default({}),
      ceilingPrices: z.record(z.string(), z.number()).default({}),
      relistCooldownHours: z.number().nonnegative()
    }),
    wallet: z.object({
      depositFeeBps: z.number().nonnegative(),
      withdrawFeeBps: z.number().nonnegative()
    }),
    guardrails: z.object({
      maxAnimalsPerUser: z.number().nonnegative(),
      maxPlotsPerUser: z.number().nonnegative()
    }),
    rentEscalationBps: z.number().nonnegative()
  }),
  events: z.object({
    disease: z.object({ active: z.boolean(), affectedSeasonalityKeys: z.array(z.string()).default([]) }),
    drought: z.object({ active: z.boolean(), severity: z.number().min(0).max(1) })
  })
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const settings = await loadEconomySettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const payload = await request.json();
  const parsed = economySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tick, pricing, events } = parsed.data;

  await prisma.$transaction([
    prisma.economyRule.upsert({
      where: { key: 'tick.config' },
      update: { value: tick },
      create: { key: 'tick.config', value: tick }
    }),
    prisma.economyRule.upsert({
      where: { key: 'pricing.controls' },
      update: { value: pricing },
      create: { key: 'pricing.controls', value: pricing }
    }),
    prisma.economyRule.upsert({
      where: { key: 'events.state' },
      update: { value: events },
      create: { key: 'events.state', value: events }
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'UPDATE_ECONOMY_SETTINGS',
        entity: 'EconomyRule',
        before: null,
        after: { tick, pricing, events }
      }
    })
  ]);

  return NextResponse.json({ tick, pricing, events });
}
