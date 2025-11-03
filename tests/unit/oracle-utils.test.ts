import { describe, expect, it } from 'vitest';

import { parseOracleUpload } from '@/lib/oracle-utils';

describe('parseOracleUpload', () => {
  it('parses valid csv payload', () => {
    const payload = 'EGG_TRY,32.5\nMILK_TRY,45.1';
    const result = parseOracleUpload(payload);
    expect(result).toEqual([
      { symbol: 'EGG_TRY', midPriceTRY: 32.5 },
      { symbol: 'MILK_TRY', midPriceTRY: 45.1 }
    ]);
  });

  it('throws for unknown symbol', () => {
    expect(() => parseOracleUpload('UNKNOWN,10')).toThrowError(/Bilinmeyen sembol/);
  });

  it('throws for invalid price', () => {
    expect(() => parseOracleUpload('EGG_TRY,abc')).toThrowError(/Geçersiz fiyat değeri/);
  });
});
