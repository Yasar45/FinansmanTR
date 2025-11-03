import { describe, expect, it } from 'vitest';

import { assertLedgerConsistency } from '@/lib/wallet';

describe('wallet invariants', () => {
  it('validates sequential ledger balances against wallet balance', () => {
    expect(() =>
      assertLedgerConsistency({
        openingBalance: 0,
        currentBalance: 150,
        entries: [
          { amount: 100, balance: 100 },
          { amount: 50, balance: 150 }
        ]
      })
    ).not.toThrow();
  });

  it('rejects negative running balances', () => {
    expect(() =>
      assertLedgerConsistency({
        openingBalance: 0,
        currentBalance: -10,
        entries: [{ amount: -10, balance: -10 }]
      })
    ).toThrow('Ledger balance cannot be negative.');
  });

  it('detects mismatched balances even when totals align', () => {
    expect(() =>
      assertLedgerConsistency({
        openingBalance: 0,
        currentBalance: 100,
        entries: [
          { amount: 40, balance: 40 },
          { amount: 60, balance: 70 }
        ]
      })
    ).toThrow('Ledger balance mismatch detected.');
  });
});
