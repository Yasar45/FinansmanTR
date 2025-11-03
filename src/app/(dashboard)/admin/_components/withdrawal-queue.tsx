'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface WithdrawalItem {
  id: string;
  amount: number;
  iban: string;
  status: string;
  createdAt: string;
  reason: string | null;
  user: { email: string };
  wallet: { currency: string };
}

interface Props {
  withdrawals: WithdrawalItem[];
}

export function WithdrawalQueue({ withdrawals }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDecision = (withdrawalId: string, decision: 'APPROVE' | 'REJECT' | 'SETTLE') => {
    const notes =
      decision === 'REJECT'
        ? window.prompt('Red gerekçesi ekleyin (opsiyonel)') ?? undefined
        : decision === 'SETTLE'
        ? window.prompt('Tamamlandı notu ekleyin (opsiyonel)') ?? undefined
        : undefined;

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body?.message ?? 'Para çekim kararı kaydedilemedi.');
        return;
      }
      router.refresh();
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Para Çekim Talepleri</h2>
          <p className="text-sm text-slate-600">Onay bekleyen ve tamamlanacak TRY transferleri.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
          {withdrawals.length} açık talep
        </span>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {withdrawals.length === 0 ? (
          <p className="text-sm text-slate-500">Bekleyen para çekim talebi yok.</p>
        ) : (
          withdrawals.map((withdrawal) => (
            <div
              key={withdrawal.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">
                  {withdrawal.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
                <p className="text-xs text-slate-500">IBAN: {withdrawal.iban}</p>
                <p className="text-xs text-slate-500">{withdrawal.user.email}</p>
                <p className="text-xs text-slate-400">
                  Oluşturulma:{' '}
                  {new Date(withdrawal.createdAt).toLocaleString('tr-TR')} · Durum: {withdrawal.status}
                </p>
                {withdrawal.reason ? (
                  <p className="text-xs text-slate-400">Not: {withdrawal.reason}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDecision(withdrawal.id, 'REJECT')}
                >
                  Reddet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDecision(withdrawal.id, 'APPROVE')}
                >
                  Onayla
                </Button>
                <Button size="sm" disabled={isPending} onClick={() => handleDecision(withdrawal.id, 'SETTLE')}>
                  Tamamlandı
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
