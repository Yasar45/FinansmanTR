'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { LocalizedLink } from '@/i18n/routing';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const common = useTranslations('common');
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const result = await signIn('credentials', {
      ...values,
      redirect: false
    });
    if (result?.error) {
      setError(t('errors.invalidCredentials', { defaultMessage: 'Giriş yapılamadı. Bilgilerinizi kontrol edin.' }));
      return;
    }
    router.push('/dashboard');
  };

  return (
    <main id="main-content" className="container-responsive flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 p-8 shadow-sm" role="region" aria-labelledby="auth-title">
        <div className="space-y-2 text-center">
          <h1 id="auth-title" className="text-2xl font-semibold">
            {t('signIn.title', { defaultMessage: 'Tekrar hoş geldiniz' })}
          </h1>
          <p className="text-sm text-slate-600">
            {t('signIn.subtitle', {
              defaultMessage: 'Çiftlik Pazar hesabınızla giriş yapın veya Google ile devam edin.'
            })}
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-describedby={error ? 'auth-error' : undefined}>
          <label className="flex flex-col gap-2 text-left">
            <span className="text-xs font-medium text-slate-600">{t('fields.email', { defaultMessage: 'E-posta' })}</span>
            <Input type="email" placeholder="eposta@ornek.com" autoComplete="email" {...register('email')} />
          </label>
          <label className="flex flex-col gap-2 text-left">
            <span className="text-xs font-medium text-slate-600">{t('fields.password', { defaultMessage: 'Şifre' })}</span>
            <Input type="password" placeholder="********" autoComplete="current-password" {...register('password')} />
          </label>
          {error ? (
            <p id="auth-error" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('signIn.submit', { defaultMessage: 'Giriş yap' })}
          </Button>
        </form>
        <div className="space-y-3 text-center">
          <Button variant="outline" className="w-full" onClick={() => signIn('google')}>
            {t('signIn.google', { defaultMessage: 'Google ile devam et' })}
          </Button>
          <p className="text-xs text-slate-500">
            {t('signIn.noAccount', { defaultMessage: 'Hesabınız yok mu?' })}{' '}
            <LocalizedLink href="/auth/sign-up" className="font-medium text-brand underline">
              {t('signIn.registerCta', { defaultMessage: 'Kayıt olun' })}
            </LocalizedLink>
          </p>
          <p className="text-xs text-slate-400">{common('authSecurityNote', { defaultMessage: 'Verileriniz KVKK kapsamında korunur.' })}</p>
        </div>
      </div>
    </main>
  );
}
