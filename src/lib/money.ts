import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = string | number | Decimal;

export function toDecimal(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

export function formatTRY(value: MoneyInput, locale: string = 'tr-TR'): string {
  const decimal = toDecimal(value);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TRY'
  }).format(Number(decimal.toFixed(2)));
}

export function add(a: MoneyInput, b: MoneyInput): Decimal {
  return toDecimal(a).add(toDecimal(b));
}

export function subtract(a: MoneyInput, b: MoneyInput): Decimal {
  return toDecimal(a).sub(toDecimal(b));
}

export function multiply(a: MoneyInput, b: MoneyInput): Decimal {
  return toDecimal(a).mul(toDecimal(b));
}

export function percentage(amount: MoneyInput, bps: MoneyInput): Decimal {
  return toDecimal(amount).mul(toDecimal(bps)).div(10000);
}

export function ensurePositive(amount: MoneyInput) {
  if (toDecimal(amount).isNegative()) {
    throw new Error('Amount must be positive');
  }
}
