import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  assertPriceGuardrails,
  calculateMarketplaceFees,
  canCreateListingToday,
  planMarketplaceSettlement,
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

describe('marketplace settlement planning', () => {
  const baseParams = {
    listingQty: new Decimal(10),
    price: new Decimal(25),
    makerFeeBps: 20,
    takerFeeBps: 40
  };

  it('marks listing as filled when remaining quantity is zero', () => {
    const result = planMarketplaceSettlement({ ...baseParams, fillQty: new Decimal(10) });
    expect(result.nextStatus).toBe('FILLED');
    expect(result.remainingQty.toNumber()).toBeCloseTo(0);
    expect(result.buyerDebit.toNumber()).toBeCloseTo(10 * 25 * 1.004);
  });

  it('supports partial fills and calculates maker/taker fees', () => {
    const result = planMarketplaceSettlement({ ...baseParams, fillQty: new Decimal(4) });
    expect(result.nextStatus).toBe('ACTIVE');
    expect(result.remainingQty.toNumber()).toBeCloseTo(6);
    expect(result.fees.makerFee.toNumber()).toBeCloseTo(4 * 25 * 0.002);
    expect(result.fees.takerFee.toNumber()).toBeCloseTo(4 * 25 * 0.004);
    expect(result.sellerCredit.toNumber()).toBeCloseTo(result.notional.sub(result.fees.makerFee).toNumber());
  });
});
