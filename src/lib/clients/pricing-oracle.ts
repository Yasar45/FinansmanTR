import Decimal from 'decimal.js';
import { OracleReferenceSource } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { ExchangeSymbol, OraclePricingConfig } from '@/lib/economy';

export type PricingOracleProviderName = 'MOCK' | 'MANUAL';

export interface PricingOracleResult {
  symbol: ExchangeSymbol;
  midPriceTRY: Decimal;
  payload?: Record<string, unknown>;
}

export interface PricingOracleOptions {
  runAt: Date;
  config: OraclePricingConfig;
}

export interface PricingOracle {
  readonly name: PricingOracleProviderName;
  fetch(symbols: ExchangeSymbol[], options: PricingOracleOptions): Promise<PricingOracleResult[]>;
}

class MockPricingOracle implements PricingOracle {
  readonly name = 'MOCK' as const;

  async fetch(symbols: ExchangeSymbol[], options: PricingOracleOptions): Promise<PricingOracleResult[]> {
    const prices = await prisma.systemPrice.findMany({ where: { symbol: { in: symbols } } });
    const baseIndex = new Map(prices.map((price) => [price.symbol as ExchangeSymbol, new Decimal(price.midPriceTRY)]));

    return symbols.map((symbol) => {
      const base = baseIndex.get(symbol);
      if (!base) {
        throw new Error(`Mock oracle base fiyatı bulunamadı: ${symbol}`);
      }
      const offset = options.config.mockOffsets[symbol] ?? 0;
      const value = base.mul(new Decimal(1).add(offset));
      return {
        symbol,
        midPriceTRY: value,
        payload: {
          offset,
          base: base.toString()
        }
      };
    });
  }
}

class ManualPricingOracle implements PricingOracle {
  readonly name = 'MANUAL' as const;

  async fetch(symbols: ExchangeSymbol[], options: PricingOracleOptions): Promise<PricingOracleResult[]> {
    const references = await prisma.oraclePriceReference.findMany({
      where: {
        symbol: { in: symbols },
        effectiveDate: { lte: options.runAt },
        source: { in: [OracleReferenceSource.MANUAL, OracleReferenceSource.CSV] }
      },
      orderBy: { effectiveDate: 'desc' }
    });

    const referenceIndex = new Map<ExchangeSymbol, typeof references[number]>();
    for (const reference of references) {
      const symbol = reference.symbol as ExchangeSymbol;
      if (!referenceIndex.has(symbol)) {
        referenceIndex.set(symbol, reference);
      }
    }

    const missing = symbols.filter((symbol) => !referenceIndex.has(symbol));
    if (missing.length > 0) {
      throw new Error(`Manuel fiyat referansı eksik: ${missing.join(', ')}`);
    }

    return symbols.map((symbol) => {
      const reference = referenceIndex.get(symbol);
      if (!reference) {
        throw new Error(`Beklenmeyen referans eksikliği: ${symbol}`);
      }
      return {
        symbol,
        midPriceTRY: new Decimal(reference.midPriceTRY),
        payload: {
          effectiveDate: reference.effectiveDate.toISOString(),
          source: reference.source
        }
      };
    });
  }
}

export async function resolvePricingOracle(config: OraclePricingConfig): Promise<PricingOracle> {
  if (config.provider === 'MANUAL') {
    return new ManualPricingOracle();
  }
  return new MockPricingOracle();
}
