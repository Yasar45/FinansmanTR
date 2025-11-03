import Decimal from 'decimal.js';
import { OracleReferenceSource, SystemPriceSource, type SystemPrice } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { EXCHANGE_SYMBOLS, loadEconomySettings } from '@/lib/economy';
import { resolvePricingOracle } from '@/lib/clients/pricing-oracle';
import type { ExchangeSymbol } from '@/lib/economy';

interface RunOracleOptions {
  triggeredBy?: string | null;
  runAt?: Date;
  symbols?: ExchangeSymbol[];
  reason?: string;
}

interface OracleRejection {
  symbol: ExchangeSymbol;
  value: Decimal;
  reason: string;
}

export interface OracleRunResult {
  provider: string;
  updated: ExchangeSymbol[];
  rejected: OracleRejection[];
  skipped: boolean;
}

function serializeSystemPrice(price: SystemPrice | null) {
  if (!price) return null;
  const value = new Decimal(price.midPriceTRY);
  return {
    symbol: price.symbol,
    midPriceTRY: value.toString(),
    spreadBps: price.spreadBps,
    source: price.source
  };
}

export async function runPricingOracle(options: RunOracleOptions = {}): Promise<OracleRunResult> {
  const settings = await loadEconomySettings();
  const config = settings.pricing.oracle;

  if (!config.enabled) {
    logger.info('Pricing oracle disabled, skipping run');
    return { provider: config.provider, updated: [], rejected: [], skipped: true };
  }

  const runAt = options.runAt ?? new Date();
  const symbols = options.symbols ?? [...EXCHANGE_SYMBOLS];
  const provider = await resolvePricingOracle(config);
  const results = await provider.fetch(symbols, { runAt, config });

  const accepted: typeof results = [];
  const rejected: OracleRejection[] = [];

  for (const result of results) {
    const bounds = config.bounds[result.symbol];
    if (bounds) {
      const min = new Decimal(bounds.min);
      const max = new Decimal(bounds.max);
      if (result.midPriceTRY.lt(min) || result.midPriceTRY.gt(max)) {
        rejected.push({
          symbol: result.symbol,
          value: result.midPriceTRY,
          reason: `Sanity bound violation (${min.toString()} - ${max.toString()})`
        });
        continue;
      }
    }
    accepted.push(result);
  }

  const updated: ExchangeSymbol[] = [];

  if (accepted.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const result of accepted) {
        const before = await tx.systemPrice.findUnique({ where: { symbol: result.symbol } });
        let record;
        if (before) {
          record = await tx.systemPrice.update({
            where: { symbol: result.symbol },
            data: {
              midPriceTRY: result.midPriceTRY.toString(),
              source: SystemPriceSource.ORACLE
            }
          });
        } else {
          record = await tx.systemPrice.create({
            data: {
              symbol: result.symbol,
              midPriceTRY: result.midPriceTRY.toString(),
              spreadBps: settings.pricing.exchange.defaultSpreadBps,
              source: SystemPriceSource.ORACLE
            }
          });
        }

        await tx.oraclePriceReference.create({
          data: {
            symbol: result.symbol,
            midPriceTRY: result.midPriceTRY.toString(),
            effectiveDate: runAt,
            source: provider.name === 'MOCK' ? OracleReferenceSource.MOCK : OracleReferenceSource.ORACLE,
            payload: {
              reason: options.reason ?? 'AUTO',
              provider: provider.name,
              metadata: result.payload ?? {}
            },
            createdById: options.triggeredBy ?? undefined
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: options.triggeredBy ?? undefined,
            action: 'ORACLE_UPDATE',
            entity: `SystemPrice:${result.symbol}`,
            before: serializeSystemPrice(before),
            after: {
              ...serializeSystemPrice(record),
              diff: {
                previous: before ? new Decimal(before.midPriceTRY).toString() : null,
                next: result.midPriceTRY.toString(),
                provider: provider.name,
                runAt: runAt.toISOString()
              }
            }
          }
        });
        updated.push(result.symbol);
      }
    });
  }

  if (rejected.length > 0) {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'ORACLE_ALERT',
            payload: {
              runAt: runAt.toISOString(),
              provider: provider.name,
              rejected: rejected.map((item) => ({
                symbol: item.symbol,
                value: item.value.toString(),
                reason: item.reason
              }))
            }
          }
        })
      )
    );

    for (const item of rejected) {
      await prisma.auditLog.create({
        data: {
          actorId: options.triggeredBy ?? undefined,
          action: 'ORACLE_REJECTED',
          entity: `SystemPrice:${item.symbol}`,
          before: null,
          after: {
            symbol: item.symbol,
            attempted: item.value.toString(),
            reason: item.reason,
            provider: provider.name,
            runAt: runAt.toISOString()
          }
        }
      });
    }
  }

  logger.info(
    {
      provider: provider.name,
      updated,
      rejected: rejected.map((item) => ({ symbol: item.symbol, reason: item.reason }))
    },
    'Oracle run completed'
  );

  return { provider: provider.name, updated, rejected, skipped: false };
}
