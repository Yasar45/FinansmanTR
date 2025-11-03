'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExchangeQuote {
  symbol: string;
  midPriceTRY: number;
  spreadBps: number;
  buyTRY: number;
  sellTRY: number;
}

interface ExchangeResponse {
  prices: ExchangeQuote[];
  preview?: {
    price: { d?: number } | { toNumber: () => number } | number;
    notional: { toNumber: () => number };
    fee: { toNumber: () => number };
    effectiveRate: { toNumber: () => number };
    slippage: { toNumber: () => number };
  };
}

function asNumber(input: any): number {
  if (typeof input === 'number') return input;
  if (input?.toNumber) return input.toNumber();
  if (input?._value) return Number(input._value);
  return Number(input);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 4 }).format(value);
}

export default function ExchangePage() {
  const [side, setSide] = useState<'BUY' | 'SELL'>('SELL');
  const [symbol, setSymbol] = useState('EGG_TRY');
  const [qty, setQty] = useState('100');
  const queryClient = useQueryClient();

  const quotesQuery = useQuery<ExchangeResponse>({
    queryKey: ['exchange', side, symbol, qty],
    queryFn: async () => {
      const params = new URLSearchParams({ symbol, side, qty: qty || '0' });
      const response = await fetch(`/api/exchange?${params.toString()}`);
      if (!response.ok) throw new Error('Fiyatlar alınamadı');
      return response.json();
    }
  });

  const tradeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, side, qty: Number(qty) })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'İşlem başarısız' }));
        throw new Error(error.message ?? 'İşlem başarısız');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'outputs'] });
    }
  });

  const prices = useMemo(() => quotesQuery.data?.prices ?? [], [quotesQuery.data?.prices]);
  const preview = quotesQuery.data?.preview;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Sistem Borsası</h1>
        <p className="text-sm text-slate-600">
          Admin tarafından yönetilen sabit spreadli fiyatlardan hızlı alım/satım yapın.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        {prices.map((price) => (
          <Card key={price.symbol} className="space-y-4 p-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{price.symbol}</h2>
              <p className="text-sm text-slate-500">Spread: {price.spreadBps} bps</p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600">
              <p>Alış: {formatCurrency(price.buyTRY)}</p>
              <p>Satış: {formatCurrency(price.sellTRY)}</p>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" variant={symbol === price.symbol && side === 'SELL' ? 'default' : 'outline'} onClick={() => {
                setSymbol(price.symbol);
                setSide('SELL');
              }}>
                Sat
              </Button>
              <Button className="flex-1" variant={symbol === price.symbol && side === 'BUY' ? 'default' : 'outline'} onClick={() => {
                setSymbol(price.symbol);
                setSide('BUY');
              }}>
                Satın al
              </Button>
            </div>
          </Card>
        ))}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm">
            <span>Sembol</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
            >
              {prices.map((price) => (
                <option key={price.symbol} value={price.symbol}>
                  {price.symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>Yön</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={side}
              onChange={(event) => setSide(event.target.value as 'BUY' | 'SELL')}
            >
              <option value="SELL">Sat</option>
              <option value="BUY">Al</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>Miktar</span>
            <Input value={qty} onChange={(event) => setQty(event.target.value)} type="number" min="0" />
          </label>
          <div className="flex items-end">
            <Button className="w-full" disabled={tradeMutation.isLoading} onClick={() => tradeMutation.mutate()}>
              İşlemi gönder
            </Button>
          </div>
        </div>
        {preview ? (
          <div className="mt-6 grid gap-3 md:grid-cols-4 text-sm text-slate-600">
            <span>İşlem fiyatı: {formatCurrency(asNumber(preview.price))}</span>
            <span>Toplam tutar: {formatCurrency(asNumber(preview.notional))}</span>
            <span>Ücret: {formatCurrency(asNumber(preview.fee))}</span>
            <span>Efektif oran: {formatCurrency(asNumber(preview.effectiveRate))} (slippage {asNumber(preview.slippage)}%)</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
