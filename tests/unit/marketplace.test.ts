import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  assertPriceGuardrails,
  calculateMarketplaceFees,
  canCreateListingToday,
  resolveOutputKind
} from '@/lib/marketplace';

describe('marketplace helpers', () => {
  it('validates price within guardrails', () => {
    expect(() =>
      assertPriceGuardrails({
        symbol: 'EGG_TRY',
        price: 20,
        floorPrices: { EGG_TRY: 10 },
        ceilingPrices: { EGG_TRY: 25 }
      })
    ).not.toThrow();
  });

  it('throws when below floor', () => {
    expect(() =>
      assertPriceGuardrails({
        symbol: 'EGG_TRY',
        price: 5,
        floorPrices: { EGG_TRY: 10 },
        ceilingPrices: { EGG_TRY: 25 }
      })
    ).toThrow();
  });

  it('computes maker/taker fees', () => {
    const fees = calculateMarketplaceFees({ notional: new Decimal(1000), makerFeeBps: 20, takerFeeBps: 40 });
    expect(fees.makerFee.toNumber()).toBeCloseTo(2);
    expect(fees.takerFee.toNumber()).toBeCloseTo(4);
    expect(fees.totalFees.toNumber()).toBeCloseTo(6);
  });

  it('enforces listing limit', () => {
    expect(() => canCreateListingToday({ createdToday: 2, dailyLimit: 5 })).not.toThrow();
    expect(() => canCreateListingToday({ createdToday: 5, dailyLimit: 5 })).toThrow('Daily listing limit reached');
  });

  it('resolves output kind from symbol', () => {
    expect(resolveOutputKind('EGG_TRY' as any)).toBeDefined();
  });
});
