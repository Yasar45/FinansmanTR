'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MarketplaceListingWithMetrics {
  id: string;
  assetRef: string;
  symbol?: string | null;
  priceTRY: number;
  qty: number;
  metadata?: Record<string, unknown> | null;
  metrics?: {
    roi: number | null;
    feedCostPerDay: number | null;
    nextHarvestAt: string | null;
  };
}

interface MarketplaceResponse {
  listings: MarketplaceListingWithMetrics[];
  pricing: {
    makerFeeBps: number;
    takerFeeBps: number;
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(
    value
  );
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 2 }).format(value);
}

export default function MarketplacePage() {
  const [assetRef, setAssetRef] = useState<string>('');
  const [symbol, setSymbol] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const queryClient = useQueryClient();

  const listingsQuery = useQuery<MarketplaceResponse>({
    queryKey: ['marketplace', assetRef, symbol, minPrice, maxPrice],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (assetRef) params.set('assetRef', assetRef);
      if (symbol) params.set('symbol', symbol);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      const response = await fetch(`/api/marketplace?${params.toString()}`);
      if (!response.ok) throw new Error('Pazar yeri yüklenemedi');
      return response.json();
    }
  });

  const tradeMutation = useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const response = await fetch(`/api/marketplace/${listingId}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'İşlem tamamlanamadı' }));
        throw new Error(error.message ?? 'İşlem tamamlanamadı');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    }
  });

  const listings = useMemo(() => listingsQuery.data?.listings ?? [], [listingsQuery.data?.listings]);
  const pricing = listingsQuery.data?.pricing;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">P2P Pazar Yeri</h1>
        <p className="text-sm text-slate-600">
          Ürünlerinizi alıcılarla buluşturun, sipariş defteri ve ücretler üzerinde tam kontrol sağlayın.
        </p>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm">
            <span>Varlık türü</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={assetRef}
              onChange={(event) => setAssetRef(event.target.value)}
            >
              <option value="">Hepsi</option>
              <option value="OUTPUT">Ürün</option>
              <option value="ANIMAL">Hayvan</option>
              <option value="PLOT">Sera/Parsel</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>Sembol</span>
            <Input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="EGG_TRY" />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>Minimum fiyat</span>
            <Input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} type="number" />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>Maksimum fiyat</span>
            <Input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} type="number" />
          </label>
          <div className="flex items-end justify-end text-sm text-slate-500">
            {pricing ? (
              <span>
                Maker ücret: {pricing.makerFeeBps / 100}% · Taker ücret: {pricing.takerFeeBps / 100}%
              </span>
            ) : null}
          </div>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        {listings.map((listing) => (
          <Card key={listing.id} className="space-y-4 p-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">
                {listing.assetRef === 'OUTPUT' ? listing.symbol ?? listing.assetRef : listing.assetRef}
              </h2>
              <p className="text-sm text-slate-500">
                Fiyat {formatCurrency(listing.priceTRY)} · Miktar {listing.qty.toLocaleString('tr-TR')}
              </p>
            </div>
            {listing.metrics ? (
              <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                <span>
                  ROI (30g):{' '}
                  {listing.metrics.roi != null ? formatPercent(listing.metrics.roi) : '—'}
                </span>
                <span>
                  Yem maliyeti/gün: {listing.metrics.feedCostPerDay != null ? formatCurrency(listing.metrics.feedCostPerDay) : '—'}
                </span>
                <span>
                  Sonraki hasat:{' '}
                  {listing.metrics.nextHarvestAt ? new Date(listing.metrics.nextHarvestAt).toLocaleDateString('tr-TR') : '—'}
                </span>
              </div>
            ) : null}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={tradeMutation.isLoading}
                onClick={() => tradeMutation.mutate({ listingId: listing.id })}
              >
                Satın al
              </Button>
              <Button className="flex-1" variant="outline">
                Detaylar
              </Button>
            </div>
          </Card>
        ))}
        {listings.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">Henüz eşleşen ilan bulunamadı.</Card>
        ) : null}
      </section>
    </div>
  );
}
