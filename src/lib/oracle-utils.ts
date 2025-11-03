import { EXCHANGE_SYMBOLS, type ExchangeSymbol } from '@/lib/economy';

export interface OracleUploadEntry {
  symbol: ExchangeSymbol;
  midPriceTRY: number;
}

export function parseOracleUpload(payload: string): OracleUploadEntry[] {
  const lines = payload
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const entries: OracleUploadEntry[] = [];

  for (const line of lines) {
    const [rawSymbol, rawPrice] = line.split(',').map((value) => value.trim());
    if (!rawSymbol || !rawPrice) {
      throw new Error('Satır biçimi geçersiz. "Sembol,Fiyat" bekleniyor.');
    }
    const symbol = rawSymbol.toUpperCase() as ExchangeSymbol;
    if (!EXCHANGE_SYMBOLS.includes(symbol)) {
      throw new Error(`Bilinmeyen sembol: ${symbol}`);
    }
    const midPriceTRY = Number(rawPrice);
    if (!Number.isFinite(midPriceTRY) || midPriceTRY <= 0) {
      throw new Error(`Geçersiz fiyat değeri: ${rawPrice}`);
    }
    entries.push({ symbol, midPriceTRY });
  }

  return entries;
}
