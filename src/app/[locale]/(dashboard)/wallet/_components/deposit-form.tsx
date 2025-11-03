'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  providers: string[];
  defaultProvider: string;
  hourlyLimit: number;
  amountLimit: number;
}

export function DepositForm({ providers, defaultProvider, hourlyLimit, amountLimit }: Props) {
  const [amount, setAmount] = useState('500');
  const [reference, setReference] = useState(() => `deposit-${Date.now()}`);
  const [provider, setProvider] = useState(defaultProvider);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Geçerli bir tutar girin.');
      return;
    }

    startTransition(async () => {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount, reference, provider })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.message ?? 'Para yatırma işlemi başlatılamadı.');
        return;
      }
      const data = await response.json();
      if (data.checkout?.checkoutUrl) {
        setMessage(`Ödeme oturumu hazır: ${data.checkout.checkoutUrl}`);
      } else {
        setMessage('Para yatırma isteği oluşturuldu.');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">Tutar (TRY)</label>
        <Input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">Referans</label>
        <Input value={reference} onChange={(event) => setReference(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">Sağlayıcı</label>
        <select
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
        >
          {providers.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-500">
        Saatlik {hourlyLimit} işlem ve toplam {amountLimit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        {' '}limiti uygulanır.
      </p>
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        Para yatırmayı başlat
      </Button>
    </form>
  );
}
