'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    consentTerms: false,
    consentKvkk: false,
    consentRisk: true,
    consentCookie: true
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.consentTerms || !form.consentKvkk) {
      setError('Kullanım koşulları ve KVKK onayı zorunludur.');
      return;
    }

    setIsSubmitting(true);
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.message ?? 'Kayıt işlemi tamamlanamadı.');
      return;
    }

    router.push('/auth/sign-in');
  };

  return (
    <main className="container-responsive flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Çiftlik Pazar&apos;a katılın</h1>
          <p className="text-sm text-slate-600">TRY cüzdanınızla üretim ekonomisine adım atın.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="fullName">
              Ad Soyad
            </label>
            <Input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="email">
              E-posta
            </label>
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="password">
              Şifre (en az 8 karakter)
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                name="consentTerms"
                checked={form.consentTerms}
                onChange={handleChange}
              />
              <span>
                <Link href="/legal/terms" className="font-medium text-brand underline">
                  Kullanım koşullarını
                </Link>{' '}
                kabul ediyorum.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                name="consentKvkk"
                checked={form.consentKvkk}
                onChange={handleChange}
              />
              <span>
                <Link href="/legal/privacy" className="font-medium text-brand underline">
                  KVKK aydınlatma metnini
                </Link>{' '}
                okudum ve onaylıyorum.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                name="consentRisk"
                checked={form.consentRisk}
                onChange={handleChange}
              />
              <span>
                <Link href="/legal/risk" className="font-medium text-brand underline">
                  Risk bildirimini
                </Link>{' '}
                anladım.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                name="consentCookie"
                checked={form.consentCookie}
                onChange={handleChange}
              />
              <span>
                <Link href="/legal/cookies" className="font-medium text-brand underline">
                  Çerez politikasını
                </Link>{' '}
                kabul ediyorum.
              </span>
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Hesap oluştur
          </Button>
        </form>
        <p className="text-center text-sm text-slate-500">
          Zaten üye misiniz?{' '}
          <Link href="/auth/sign-in" className="font-medium text-brand underline">
            Giriş yapın
          </Link>
        </p>
      </div>
    </main>
  );
}
