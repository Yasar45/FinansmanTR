'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OutputRow {
  id: string;
  kind: string;
  symbol: string;
  qty: number;
  unit: string;
  avgCostTRY: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(
    value
  );
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [listingTarget, setListingTarget] = useState<OutputRow | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [listingQty, setListingQty] = useState('');

  const outputsQuery = useQuery<{ outputs: OutputRow[] }>({
    queryKey: ['inventory', 'outputs'],
    queryFn: async () => {
      const response = await fetch('/api/inventory/outputs');
      if (!response.ok) throw new Error('Envanter yüklenemedi');
      return response.json();
    },
    staleTime: 30_000
  });

  const sellMutation = useMutation({
    mutationFn: async ({ symbol, qty }: { symbol: string; qty: number }) => {
      const response = await fetch('/api/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, qty, side: 'SELL' })
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

  const listingMutation = useMutation({
    mutationFn: async ({ symbol, qty, price }: { symbol: string; qty: number; price: number }) => {
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetRef: 'OUTPUT', symbol, qty, priceTRY: price })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'İlan oluşturulamadı' }));
        throw new Error(error.message ?? 'İlan oluşturulamadı');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'outputs'] });
      setListingTarget(null);
      setListingPrice('');
      setListingQty('');
    }
  });

  const outputs = useMemo(() => outputsQuery.data?.outputs ?? [], [outputsQuery.data?.outputs]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Envanter</h1>
        <p className="text-sm text-slate-600">
          Ürettiğiniz tarımsal ve hayvansal ürünleri görüntüleyin, sistem borsasına veya pazar yerine yönlendirin.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {outputs.map((output) => (
          <Card key={output.id} className="space-y-4 p-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{output.kind}</h2>
              <p className="text-sm text-slate-500">
                {output.qty.toLocaleString('tr-TR')} {output.unit} · Ortalama maliyet {formatCurrency(output.avgCostTRY)}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={sellMutation.isLoading}
                onClick={() => sellMutation.mutate({ symbol: output.symbol, qty: output.qty })}
              >
                Borsada sat
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setListingTarget(output);
                  setListingQty(String(output.qty));
                  setListingPrice(String(Math.max(output.avgCostTRY * 1.1, 1).toFixed(2)));
                }}
              >
                Pazar ilanı
              </Button>
            </div>
          </Card>
        ))}
      </section>
      {listingTarget ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{listingTarget.kind} için ilan oluştur</h3>
              <p className="text-sm text-slate-500">
                {listingTarget.qty.toLocaleString('tr-TR')} {listingTarget.unit} mevcut · Sembol {listingTarget.symbol}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setListingTarget(null)}>
              Vazgeç
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span>Adet</span>
              <Input value={listingQty} onChange={(event) => setListingQty(event.target.value)} type="number" min="0" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>Birim fiyat (₺)</span>
              <Input
                value={listingPrice}
                onChange={(event) => setListingPrice(event.target.value)}
                type="number"
                step="0.01"
                min="0"
              />
            </label>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={listingMutation.isLoading}
                onClick={() => {
                  const qty = Number(listingQty);
                  const price = Number(listingPrice);
                  if (!qty || !price) return;
                  listingMutation.mutate({ symbol: listingTarget.symbol, qty, price });
                }}
              >
                İlanı yayınla
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
