'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  kycStatus: string;
}

export function WithdrawForm({ kycStatus }: Props) {
  const [amount, setAmount] = useState('250');
  const [iban, setIban] = useState('TR000000000000000000000000');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canWithdraw = kycStatus === 'VERIFIED';

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!canWithdraw) {
      setError('Para çekimi için KYC doğrulaması gereklidir.');
      return;
    }
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Geçerli bir tutar girin.');
      return;
    }

    startTransition(async () => {
      const response = await fetch('/api/wallet/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount, iban })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.message ?? 'Para çekim talebi oluşturulamadı.');
        return;
      }
      setMessage('Para çekim talebiniz yönetici onayına gönderildi.');
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">IBAN</label>
        <Input value={iban} onChange={(event) => setIban(event.target.value.toUpperCase())} required />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">Tutar (TRY)</label>
        <Input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required />
      </div>
      {!canWithdraw ? (
        <p className="text-xs text-amber-600">Para çekmek için KYC doğrulamanızı tamamlayın.</p>
      ) : null}
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending || !canWithdraw}>
        Çekim talebi oluştur
      </Button>
    </form>
  );
}
