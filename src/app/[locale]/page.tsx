import { Button } from '@/components/ui/button';
import { LocalizedLink } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';

export default async function LandingPage() {
  const t = await getTranslations('common');
  const highlights = ['landing.highlightProduction', 'landing.highlightWallet', 'landing.highlightAdmin'] as const;

  return (
    <main id="main-content" className="container-responsive space-y-16 py-16">
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800">
            {t('appName', { defaultMessage: 'Çiftlik Pazar · FarmHub TR' })}
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('landing.heroTitle', { defaultMessage: 'Türkiye\'nin dijital çiftlik ekonomisine hoş geldiniz.' })}
          </h1>
          <p className="text-lg text-slate-600">
            {t('landing.heroSubtitle', {
              defaultMessage:
                'Hayvanlarınızı büyütün, seralarda üretim yapın, ürünlerinizi sistem borsasına veya P2P pazara satın. TRY cüzdanı, KYC uyumluluğu ve modern arayüz ile güvenle yönetin.'
            })}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <LocalizedLink href="/auth/sign-in">{t('landing.getStarted', { defaultMessage: 'Başla' })}</LocalizedLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <LocalizedLink href="/help">{t('landing.howItWorks', { defaultMessage: 'Nasıl çalışır?' })}</LocalizedLink>
            </Button>
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-8 shadow-xl">
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">{t('landing.statAssets', { defaultMessage: 'Varlık kategorileri' })}</dt>
              <dd className="text-3xl font-semibold">20+</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('landing.statTicks', { defaultMessage: 'Saatlik üretim turları' })}</dt>
              <dd className="text-3xl font-semibold">BullMQ</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('landing.statWallet', { defaultMessage: 'TRY cüzdanı' })}</dt>
              <dd className="text-3xl font-semibold">{t('landing.doubleEntry', { defaultMessage: 'Çift yönlü kayıt' })}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('landing.statMarketplace', { defaultMessage: 'Pazar yeri' })}</dt>
              <dd className="text-3xl font-semibold">P2P</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="grid gap-8 lg:grid-cols-3">
        {highlights.map((key) => (
          <div key={key} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xl font-semibold">{t(`${key}.title`)}</h3>
            <p className="mt-3 text-sm text-slate-600">{t(`${key}.description`)}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
