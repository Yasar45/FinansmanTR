import Decimal from 'decimal.js';
import { OutputKind } from '@prisma/client';
import { toDecimal } from '@/lib/money';
import { ExchangeSymbol } from '@/lib/economy';

export const MARKETPLACE_ASSET_REFS = ['ANIMAL', 'PLOT', 'OUTPUT'] as const;
export type MarketplaceAssetRef = (typeof MARKETPLACE_ASSET_REFS)[number];

export const OUTPUT_SYMBOL_TO_KIND: Record<ExchangeSymbol, OutputKind> = {
  EGG_TRY: OutputKind.EGG,
  MILK_TRY: OutputKind.MILK,
  HONEY_TRY: OutputKind.HONEY,
  TOMATO_TRY: OutputKind.TOMATO,
  PEPPER_TRY: OutputKind.PEPPER,
  EGGPLANT_TRY: OutputKind.EGGPLANT,
  LETTUCE_TRY: OutputKind.LETTUCE
};

export const OUTPUT_KIND_TO_SYMBOL = Object.fromEntries(
  Object.entries(OUTPUT_SYMBOL_TO_KIND).map(([symbol, kind]) => [kind, symbol])
) as Record<OutputKind, ExchangeSymbol>;

export function resolveOutputKind(symbol: ExchangeSymbol): OutputKind {
  return OUTPUT_SYMBOL_TO_KIND[symbol];
}

export function calculateMarketplaceFees(params: {
  notional: number | string | Decimal;
  makerFeeBps: number;
  takerFeeBps: number;
}) {
  const notional = toDecimal(params.notional);
  const makerFee = notional.mul(toDecimal(params.makerFeeBps).div(10_000));
  const takerFee = notional.mul(toDecimal(params.takerFeeBps).div(10_000));
  return { makerFee, takerFee, totalFees: makerFee.add(takerFee) };
}

export function assertPriceGuardrails(params: {
  symbol: string;
  price: number | string | Decimal;
  floorPrices: Record<string, number>;
  ceilingPrices: Record<string, number>;
}) {
  if (!params.symbol) {
    return;
  }
  const price = toDecimal(params.price);
  const floor = params.floorPrices[params.symbol];
  const ceiling = params.ceilingPrices[params.symbol];

  if (typeof floor === 'number' && price.lt(floor)) {
    throw new Error(`Price ${price.toNumber()} is below floor ${floor} for ${params.symbol}`);
  }

  if (typeof ceiling === 'number' && price.gt(ceiling)) {
    throw new Error(`Price ${price.toNumber()} is above ceiling ${ceiling} for ${params.symbol}`);
  }
}

export function canCreateListingToday(params: {
  createdToday: number;
  dailyLimit: number;
}) {
  if (params.dailyLimit > 0 && params.createdToday >= params.dailyLimit) {
    throw new Error('Daily listing limit reached');
  }
}
