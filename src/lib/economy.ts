import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';
import { z } from 'zod';
import { toDecimal } from '@/lib/money';

const tickConfigSchema = z
  .object({
    tickLengthMinutes: z.number().positive().default(60),
    animalProductivityMultiplier: z.number().positive().default(1),
    cropProductivityMultiplier: z.number().positive().default(1),
    mortalityRateBps: z.number().nonnegative().default(0),
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
  })
  .default({
    tickLengthMinutes: 60,
    animalProductivityMultiplier: 1,
    cropProductivityMultiplier: 1,
    mortalityRateBps: 0,
    seasonality: {}
  });

const pricingControlsSchema = z
  .object({
    exchange: z
      .object({
        defaultSpreadBps: z.number().nonnegative().default(0)
      })
      .default({ defaultSpreadBps: 0 }),
    marketplace: z
      .object({
        makerFeeBps: z.number().nonnegative().default(0),
        takerFeeBps: z.number().nonnegative().default(0),
        floorPrices: z.record(z.string(), z.number()).default({}),
        ceilingPrices: z.record(z.string(), z.number()).default({}),
        relistCooldownHours: z.number().nonnegative().default(0)
      })
      .default({ makerFeeBps: 0, takerFeeBps: 0, floorPrices: {}, ceilingPrices: {}, relistCooldownHours: 0 }),
    wallet: z
      .object({
        depositFeeBps: z.number().nonnegative().default(0),
        withdrawFeeBps: z.number().nonnegative().default(0)
      })
      .default({ depositFeeBps: 0, withdrawFeeBps: 0 }),
    guardrails: z
      .object({
        maxAnimalsPerUser: z.number().nonnegative().default(0),
        maxPlotsPerUser: z.number().nonnegative().default(0)
      })
      .default({ maxAnimalsPerUser: 0, maxPlotsPerUser: 0 }),
    rentEscalationBps: z.number().nonnegative().default(0)
  })
  .default({
    exchange: { defaultSpreadBps: 0 },
    marketplace: { makerFeeBps: 0, takerFeeBps: 0, floorPrices: {}, ceilingPrices: {}, relistCooldownHours: 0 },
    wallet: { depositFeeBps: 0, withdrawFeeBps: 0 },
    guardrails: { maxAnimalsPerUser: 0, maxPlotsPerUser: 0 },
    rentEscalationBps: 0
  });

const eventsSchema = z
  .object({
    disease: z
      .object({
        active: z.boolean(),
        affectedSeasonalityKeys: z.array(z.string()).default([])
      })
      .default({ active: false, affectedSeasonalityKeys: [] }),
    drought: z
      .object({
        active: z.boolean(),
        severity: z.number().min(0).max(1).default(0)
      })
      .default({ active: false, severity: 0 })
  })
  .default({
    disease: { active: false, affectedSeasonalityKeys: [] },
    drought: { active: false, severity: 0 }
  });

export type TickConfig = z.infer<typeof tickConfigSchema>;
export type PricingControls = z.infer<typeof pricingControlsSchema>;
export type EconomyEvents = z.infer<typeof eventsSchema>;

export interface EconomySettings {
  tick: TickConfig;
  pricing: PricingControls;
  events: EconomyEvents;
}

export async function loadEconomySettings(): Promise<EconomySettings> {
  const rules = await prisma.economyRule.findMany();
  const registry = rules.reduce<Record<string, unknown>>((acc, rule) => {
    acc[rule.key] = rule.value;
    return acc;
  }, {});

  const tick = tickConfigSchema.parse(registry['tick.config'] ?? {});
  const pricing = pricingControlsSchema.parse(registry['pricing.controls'] ?? {});
  const events = eventsSchema.parse(registry['events.state'] ?? {});

  return { tick, pricing, events };
}

export function resolveSeason(date: Date): 'winter' | 'spring' | 'summer' | 'autumn' {
  const month = date.getUTCMonth() + 1;
  if (month === 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'autumn';
}

export function seasonalityMultiplier(
  settings: EconomySettings,
  key: string | null | undefined,
  tickAt: Date
): Decimal {
  if (!key) return new Decimal(1);
  const season = resolveSeason(tickAt);
  const table = settings.tick.seasonality[key];
  if (!table) return new Decimal(1);
  const seasonal = table[season];
  return seasonal ? toDecimal(seasonal) : new Decimal(1);
}

export function diseaseMultiplier(settings: EconomySettings, key: string | null | undefined): Decimal {
  const event = settings.tick.diseaseEvent;
  if (!event?.active) return new Decimal(1);
  if (event.affectedSeasonalityKeys && event.affectedSeasonalityKeys.length > 0) {
    if (!key || !event.affectedSeasonalityKeys.includes(key)) {
      return new Decimal(1);
    }
  }
  return new Decimal(1).minus(toDecimal(event.penalty ?? 0));
}

export function droughtMultiplier(
  settings: EconomySettings,
  resilient: boolean
): Decimal {
  const event = settings.tick.droughtEvent;
  if (!event?.active) return new Decimal(1);
  if (resilient) return new Decimal(1);
  return new Decimal(1).minus(toDecimal(event.penalty ?? 0));
}

export function computeExchangeQuotes(mid: number | string | Decimal, spreadBps: number): {
  buy: Decimal;
  sell: Decimal;
} {
  const midDecimal = toDecimal(mid);
  const spread = toDecimal(spreadBps).div(10_000);
  const buy = midDecimal.mul(new Decimal(1).minus(spread));
  const sell = midDecimal.mul(new Decimal(1).add(spread));
  return { buy, sell };
}

export function projectROI(params: {
  expectedRevenue30d: number | string | Decimal;
  expectedCosts30d: number | string | Decimal;
  assetCost: number | string | Decimal;
}): Decimal {
  const revenue = toDecimal(params.expectedRevenue30d);
  const costs = toDecimal(params.expectedCosts30d);
  const assetCost = toDecimal(params.assetCost);
  if (assetCost.isZero()) {
    return new Decimal(0);
  }
  return revenue.sub(costs).div(assetCost);
}
