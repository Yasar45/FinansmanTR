import { describe, expect, it } from 'vitest';

import {
  buildExchangePreview,
  computeExchangeQuotes,
  droughtMultiplier,
  projectROI,
  seasonalityMultiplier,
  type EconomySettings
} from '@/lib/economy';
import Decimal from 'decimal.js';

const baseSettings: EconomySettings = {
  tick: {
    tickLengthMinutes: 60,
    animalProductivityMultiplier: 1,
    cropProductivityMultiplier: 1,
    mortalityRateBps: 0,
    diseaseEvent: { active: false, penalty: 0.25, affectedSeasonalityKeys: [] },
    droughtEvent: { active: false, penalty: 0.3 },
    seasonality: {
      eggs: { winter: 0.85, summer: 1.1 }
    }
  },
  pricing: {
    exchange: { defaultSpreadBps: 40, tradeFeeBps: 15 },
    marketplace: {
      makerFeeBps: 20,
      takerFeeBps: 40,
      floorPrices: { EGG: 8 },
      ceilingPrices: { EGG: 30 },
      relistCooldownHours: 6,
      dailyListingLimit: 5
    },
    wallet: { depositFeeBps: 15, withdrawFeeBps: 25 },
    guardrails: { maxAnimalsPerUser: 50, maxPlotsPerUser: 10 },
    rentEscalationBps: 120
  },
  events: {
    disease: { active: false, affectedSeasonalityKeys: [] },
    drought: { active: false, severity: 0.2 }
  }
};

describe('economy formulas', () => {
  it('computes exchange quotes with spread', () => {
    const { buy, sell } = computeExchangeQuotes(100, 200);
    expect(buy.toNumber()).toBeCloseTo(98);
    expect(sell.toNumber()).toBeCloseTo(102);
  });

  it('projects ROI over 30 days', () => {
    const roi = projectROI({ expectedRevenue30d: 12000, expectedCosts30d: 9000, assetCost: 6000 });
    expect(roi.toNumber()).toBeCloseTo(0.5);
  });

  it('applies seasonality multipliers by season key', () => {
    const winter = seasonalityMultiplier(baseSettings, 'eggs', new Date('2024-01-15T00:00:00Z'));
    const summer = seasonalityMultiplier(baseSettings, 'eggs', new Date('2024-07-15T00:00:00Z'));
    expect(winter.toNumber()).toBeCloseTo(0.85);
    expect(summer.toNumber()).toBeCloseTo(1.1);
  });

  it('reduces productivity under drought when not resilient', () => {
    const penalty = droughtMultiplier(
      {
        ...baseSettings,
        tick: { ...baseSettings.tick, droughtEvent: { active: true, penalty: 0.3 } }
      },
      false
    );
    expect(penalty.toNumber()).toBeCloseTo(new Decimal(0.7).toNumber());
  });

  it('keeps productivity when resilient to drought', () => {
    const neutral = droughtMultiplier(
      {
        ...baseSettings,
        tick: { ...baseSettings.tick, droughtEvent: { active: true, penalty: 0.3 } }
      },
      true
    );
    expect(neutral.toNumber()).toBeCloseTo(1);
  });
});

describe('exchange preview', () => {
  it('calculates price, fees and effective rate with zero slippage', () => {
    const preview = buildExchangePreview({ mid: 100, spreadBps: 50, side: 'SELL', qty: 10, feeBps: 15 });
    expect(preview.price.toNumber()).toBeCloseTo(95); // sell side uses bid
    expect(preview.notional.toNumber()).toBeCloseTo(950);
    expect(preview.fee.toNumber()).toBeCloseTo(1.425);
    expect(preview.effectiveRate.toNumber()).toBeCloseTo(94.8575);
    expect(preview.slippage.toNumber()).toBe(0);
  });
});
