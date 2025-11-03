import Decimal from 'decimal.js';

function normalize(value: number | string | Decimal) {
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return value;
}

export function formatCurrency(value: number | string | Decimal, locale: string = 'tr-TR') {
  const amount = normalize(value);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatNumber(value: number | string | Decimal, locale: string = 'tr-TR', options?: Intl.NumberFormatOptions) {
  const amount = normalize(value);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, ...options }).format(amount);
}

export function formatDateTime(date: Date | string, locale: string = 'tr-TR') {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}
