'use client';

import { useState, useTransition, useOptimistic } from 'react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  addFraudFlagAction,
  removeFraudFlagAction,
  upsertBlacklistEntryAction,
  deleteBlacklistEntryAction
} from '../actions';
import { BlacklistType } from '@prisma/client';

interface FraudFlagSummary {
  id: string;
  userId: string;
  reason: string;
  createdAt: string;
}

interface BlacklistSummary {
  id: string;
  type: BlacklistType;
  value: string;
  reason: string | null;
  createdAt: string;
}

interface Props {
  fraudFlags: FraudFlagSummary[];
  blacklist: BlacklistSummary[];
  marketplaceFeeInfo: {
    makerFeeBps: number;
    takerFeeBps: number;
    floorPrices: Record<string, number>;
    ceilingPrices: Record<string, number>;
    dailyListingLimit: number;
  };
}

type FraudAction =
  | { type: 'add'; value: FraudFlagSummary }
  | { type: 'remove'; id: string }
  | { type: 'replace'; values: FraudFlagSummary[] };

type BlacklistAction =
  | { type: 'upsert'; value: BlacklistSummary }
  | { type: 'remove'; id: string }
  | { type: 'replace'; values: BlacklistSummary[] };

export function MarketplaceGuardrails({ fraudFlags, blacklist, marketplaceFeeInfo }: Props) {
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Ücret & Limit Özeti</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Maker Ücreti</p>
            <p className="text-lg font-semibold text-slate-900">{marketplaceFeeInfo.makerFeeBps} bps</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Taker Ücreti</p>
            <p className="text-lg font-semibold text-slate-900">{marketplaceFeeInfo.takerFeeBps} bps</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Günlük Liste Sınırı</p>
            <p className="text-lg font-semibold text-slate-900">{marketplaceFeeInfo.dailyListingLimit}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Taban Fiyatlar</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {Object.entries(marketplaceFeeInfo.floorPrices).map(([symbol, price]) => (
                <li key={symbol} className="flex justify-between">
                  <span>{symbol}</span>
                  <span>{price.toLocaleString('tr-TR')}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tavan Fiyatlar</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {Object.entries(marketplaceFeeInfo.ceilingPrices).map(([symbol, price]) => (
                <li key={symbol} className="flex justify-between">
                  <span>{symbol}</span>
                  <span>{price.toLocaleString('tr-TR')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
      <FraudFlagsCard fraudFlags={fraudFlags} />
      <BlacklistCard entries={blacklist} />
    </div>
  );
}

function FraudFlagsCard({ fraudFlags }: { fraudFlags: FraudFlagSummary[] }) {
  const emptyForm = { userId: '', reason: '' };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [optimisticFlags, dispatch] = useOptimistic<FraudFlagSummary[], FraudAction>(fraudFlags, (state, action) => {
    switch (action.type) {
      case 'replace':
        return action.values;
      case 'remove':
        return state.filter((item) => item.id !== action.id);
      case 'add':
        return [action.value, ...state];
      default:
        return state;
    }
  });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!form.userId || !form.reason) {
      setMessage('Kullanıcı ID ve gerekçe zorunludur.');
      return;
    }
    setMessage(null);
    const optimisticValue: FraudFlagSummary = {
      id: `optimistic-${Date.now()}`,
      userId: form.userId,
      reason: form.reason,
      createdAt: new Date().toISOString()
    };
    const snapshot = optimisticFlags;
    dispatch({ type: 'add', value: optimisticValue });
    startTransition(async () => {
      try {
        const saved = await addFraudFlagAction({ userId: form.userId, reason: form.reason });
        dispatch({
          type: 'add',
          value: { id: saved.id, userId: saved.userId, reason: saved.reason, createdAt: saved.createdAt.toISOString() }
        });
        setMessage('Fraud flag eklendi.');
        setForm(emptyForm);
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Fraud flag eklenemedi.');
      }
    });
  };

  const handleRemove = (id: string) => {
    const snapshot = optimisticFlags;
    dispatch({ type: 'remove', id });
    startTransition(async () => {
      try {
        await removeFraudFlagAction({ id });
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Kayıt silinemedi.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold">Fraud Bayrakları</h3>
        <p className="text-sm text-slate-600">Wash trading veya şüpheli hesaplar için işaretler.</p>
      </header>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          value={form.userId}
          onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
          placeholder="Kullanıcı ID"
        />
        <Input
          value={form.reason}
          onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
          placeholder="Gerekçe"
        />
      </div>
      <Button size="sm" disabled={isPending} onClick={handleSubmit}>
        Ekle
      </Button>
      <div className="space-y-2">
        {optimisticFlags.length === 0 ? (
          <p className="text-sm text-slate-500">Aktif fraud bayrağı yok.</p>
        ) : (
          optimisticFlags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">{flag.userId}</p>
                <p className="text-xs text-slate-500">{flag.reason}</p>
              </div>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleRemove(flag.id)}>
                Sil
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function BlacklistCard({ entries }: { entries: BlacklistSummary[] }) {
  const emptyForm = { id: '', type: BlacklistType.IP as BlacklistType, value: '', reason: '' };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [optimisticEntries, dispatch] = useOptimistic<BlacklistSummary[], BlacklistAction>(entries, (state, action) => {
    switch (action.type) {
      case 'replace':
        return action.values;
      case 'remove':
        return state.filter((item) => item.id !== action.id);
      case 'upsert':
        if (state.some((item) => item.id === action.value.id)) {
          return state.map((item) => (item.id === action.value.id ? action.value : item));
        }
        return [action.value, ...state];
      default:
        return state;
    }
  });
  const [isPending, startTransition] = useTransition();

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = () => {
    if (!form.value) {
      setMessage('Değer zorunludur.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticEntries;
    const optimisticValue: BlacklistSummary = {
      id: form.id || `optimistic-${Date.now()}`,
      type: form.type,
      value: form.value,
      reason: form.reason || null,
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'upsert', value: optimisticValue });
    startTransition(async () => {
      try {
        const saved = await upsertBlacklistEntryAction({
          id: form.id || undefined,
          type: form.type,
          value: form.value,
          reason: form.reason || undefined
        });
        dispatch({
          type: 'upsert',
          value: {
            id: saved.id,
            type: saved.type,
            value: saved.value,
            reason: saved.reason ?? null,
            createdAt: saved.createdAt.toISOString()
          }
        });
        setMessage('Kara liste güncellendi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Kara liste güncellenemedi.');
      }
    });
  };

  const handleDelete = (id: string) => {
    const snapshot = optimisticEntries;
    dispatch({ type: 'remove', id });
    startTransition(async () => {
      try {
        await deleteBlacklistEntryAction({ id });
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Kayıt silinemedi.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold">Kara Liste</h3>
        <p className="text-sm text-slate-600">IP veya adres temelli kara liste girdileri.</p>
      </header>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <select
          value={form.type}
          onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as BlacklistType }))}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-700"
        >
          <option value={BlacklistType.IP}>IP</option>
          <option value={BlacklistType.ADDRESS}>Adres</option>
        </select>
        <Input
          value={form.value}
          onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
          placeholder="Değer"
        />
        <Input
          value={form.reason}
          onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
          placeholder="Gerekçe (opsiyonel)"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={handleSubmit}>
          Kaydet
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={resetForm}>
          Temizle
        </Button>
      </div>
      <div className="space-y-2">
        {optimisticEntries.length === 0 ? (
          <p className="text-sm text-slate-500">Kara liste boş.</p>
        ) : (
          optimisticEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {entry.type}: {entry.value}
                </p>
                <p className="text-xs text-slate-500">{entry.reason ?? '—'}</p>
              </div>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleDelete(entry.id)}>
                Sil
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
