import Decimal from 'decimal.js';

import { toDecimal } from '@/lib/money';

export interface LedgerEntryLike {
  amount: Decimal.Value;
  balance: Decimal.Value;
  createdAt?: Date;
}

export interface LedgerInvariantInput {
  currentBalance: Decimal.Value;
  openingBalance?: Decimal.Value;
  entries: LedgerEntryLike[];
}

export function assertLedgerConsistency(input: LedgerInvariantInput) {
  const currentBalance = toDecimal(input.currentBalance);
  const openingBalance = input.openingBalance
    ? toDecimal(input.openingBalance)
    : deriveOpeningBalance(currentBalance, input.entries);

  if (openingBalance.lt(0)) {
    throw new Error('Opening balance cannot be negative.');
  }

  let running = openingBalance;
  for (const entry of input.entries) {
    const amount = toDecimal(entry.amount);
    running = running.add(amount);
    if (running.lt(0)) {
      throw new Error('Ledger balance cannot be negative.');
    }

    const entryBalance = toDecimal(entry.balance);
    if (!entryBalance.eq(running)) {
      throw new Error('Ledger balance mismatch detected.');
    }
  }

  if (!running.eq(currentBalance)) {
    throw new Error('Wallet balance does not match ledger.');
  }
}

function deriveOpeningBalance(currentBalance: Decimal, entries: LedgerEntryLike[]) {
  if (entries.length === 0) {
    return currentBalance;
  }

  const totalMovements = entries.reduce((acc, entry) => acc.add(toDecimal(entry.amount)), new Decimal(0));
  return currentBalance.sub(totalMovements);
}
