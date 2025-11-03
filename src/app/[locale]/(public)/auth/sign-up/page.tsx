'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { LocalizedLink } from '@/i18n/routing';

export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const legal = useTranslations('legal');
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
      setError(t('errors.missingConsents', { defaultMessage: 'Kullanım koşulları ve KVKK onayı zorunludur.' }));
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
      setError(payload?.message ?? t('errors.registrationFailed', { defaultMessage: 'Kayıt işlemi tamamlanamadı.' }));
      return;
    }

    router.push('/auth/sign-in');
  };

  return (
    <main id="main-content" className="container-responsive flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-200 p-8 shadow-sm" role="region" aria-labelledby="signup-title">
        <div className="space-y-2 text-center">
          <h1 id="signup-title" className="text-2xl font-semibold">
            {t('signUp.title', { defaultMessage: "Çiftlik Pazar'a katılın" })}
          </h1>
          <p className="text-sm text-slate-600">{t('signUp.subtitle', { defaultMessage: 'TRY cüzdanınızla üretim ekonomisine adım atın.' })}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="fullName">
              {t('signUp.fullName', { defaultMessage: 'Ad Soyad' })}
            </label>
            <Input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} required autoComplete="name" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="email">
              {t('fields.email', { defaultMessage: 'E-posta' })}
            </label>
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="password">
              {t('signUp.passwordLabel', { defaultMessage: 'Şifre (en az 8 karakter)' })}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-3 rounded-lg border border-slate-200 p-4" role="group" aria-labelledby="consent-section">
            <p id="consent-section" className="text-xs font-semibold text-slate-600">
              {t('signUp.consentsTitle', { defaultMessage: 'Zorunlu onaylar' })}
            </p>
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input type="checkbox" name="consentTerms" checked={form.consentTerms} onChange={handleChange} />
              <span>
                <LocalizedLink href="/legal/terms" className="font-medium text-brand underline">
                  {legal('documents.terms.title', { defaultMessage: 'Kullanım koşulları' })}
                </LocalizedLink>{' '}
                {t('signUp.acceptSuffix', { defaultMessage: 'kabul ediyorum.' })}
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input type="checkbox" name="consentKvkk" checked={form.consentKvkk} onChange={handleChange} />
              <span>
                <LocalizedLink href="/legal/privacy" className="font-medium text-brand underline">
                  {legal('documents.privacy.title', { defaultMessage: 'KVKK & Gizlilik' })}
                </LocalizedLink>{' '}
                {t('signUp.readConfirm', { defaultMessage: 'okudum ve onaylıyorum.' })}
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input type="checkbox" name="consentRisk" checked={form.consentRisk} onChange={handleChange} />
              <span>
                <LocalizedLink href="/legal/risk" className="font-medium text-brand underline">
                  {legal('documents.risk.title', { defaultMessage: 'Risk bildirimi' })}
                </LocalizedLink>{' '}
                {t('signUp.acknowledge', { defaultMessage: 'anladım.' })}
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input type="checkbox" name="consentCookie" checked={form.consentCookie} onChange={handleChange} />
              <span>
                <LocalizedLink href="/legal/cookies" className="font-medium text-brand underline">
                  {legal('documents.cookies.title', { defaultMessage: 'Çerez politikası' })}
                </LocalizedLink>{' '}
                {t('signUp.acceptSuffix', { defaultMessage: 'kabul ediyorum.' })}
              </span>
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('signUp.submit', { defaultMessage: 'Hesap oluştur' })}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-500">
          {t('signUp.hasAccount', { defaultMessage: 'Zaten üye misiniz?' })}{' '}
          <LocalizedLink href="/auth/sign-in" className="font-medium text-brand underline">
            {t('signUp.signInCta', { defaultMessage: 'Giriş yapın' })}
          </LocalizedLink>
        </p>
      </div>
    </main>
  );
}
