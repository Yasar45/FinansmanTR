'use client';

import { useEffect, useOptimistic, useState, useTransition } from 'react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateSystemPriceAction } from '../actions';

interface SystemPriceRowData {
  symbol: string;
  midPriceTRY: number;
  spreadBps: number;
  source: string;
}

type OptimisticAction =
  | { type: 'update'; symbol: string; midPriceTRY: number; spreadBps: number }
  | { type: 'replace'; prices: SystemPriceRowData[] };

interface Props {
  prices: SystemPriceRowData[];
}

export function SystemPriceEditor({ prices }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [optimisticPrices, dispatchOptimistic] = useOptimistic<SystemPriceRowData[], OptimisticAction>(
    prices,
    (state, action) => {
      if (action.type === 'replace') {
        return action.prices;
      }
      return state.map((price) =>
        price.symbol === action.symbol
          ? { ...price, midPriceTRY: action.midPriceTRY, spreadBps: action.spreadBps }
          : price
      );
    }
  );
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (symbol: string, midPriceTRY: number, spreadBps: number) => {
    setError(null);
    const snapshot = optimisticPrices;
    dispatchOptimistic({ type: 'update', symbol, midPriceTRY, spreadBps });
    startTransition(async () => {
      try {
        await updateSystemPriceAction({ symbol, midPriceTRY, spreadBps });
      } catch (error) {
        dispatchOptimistic({ type: 'replace', prices: snapshot });
        setError(error instanceof Error ? error.message : 'Fiyat güncellenemedi.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sistem Fiyatları</h2>
          <p className="text-sm text-slate-600">
            Admin kaynaklı TRY kotasyonlarını güncelleyin. Spread değişiklikleri Exchange'e anında yansır.
          </p>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {optimisticPrices.map((price) => (
          <SystemPriceRow
            key={price.symbol}
            price={price}
            disabled={isPending}
            onSubmit={handleUpdate}
          />
        ))}
      </div>
    </Card>
  );
}

interface RowProps {
  price: SystemPriceRowData;
  onSubmit: (symbol: string, midPriceTRY: number, spreadBps: number) => void;
  disabled: boolean;
}

function SystemPriceRow({ price, onSubmit, disabled }: RowProps) {
  const [mid, setMid] = useState(price.midPriceTRY.toString());
  const [spread, setSpread] = useState(price.spreadBps.toString());

  useEffect(() => {
    setMid(price.midPriceTRY.toString());
    setSpread(price.spreadBps.toString());
  }, [price.midPriceTRY, price.spreadBps]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{price.symbol}</p>
        <p className="text-xs text-slate-500">Kaynak: {price.source}</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
        <Input
          value={mid}
          onChange={(event) => setMid(event.target.value)}
          aria-label={`${price.symbol} mid`}
          className="md:max-w-[160px]"
        />
        <Input
          value={spread}
          onChange={(event) => setSpread(event.target.value)}
          aria-label={`${price.symbol} spread`}
          className="md:max-w-[120px]"
        />
        <Button
          size="sm"
          disabled={disabled}
          onClick={() => onSubmit(price.symbol, Number(mid), Number(spread))}
        >
          Kaydet
        </Button>
      </div>
    </div>
  );
}
