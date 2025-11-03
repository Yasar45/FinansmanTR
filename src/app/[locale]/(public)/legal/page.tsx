import { LocalizedLink as Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';

const documentKeys = ['terms', 'privacy', 'risk', 'cookies'] as const;

export default async function LegalPage() {
  const t = await getTranslations('legal');

  return (
    <main id="main-content" className="container-responsive space-y-12 py-16">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold">{t('overviewTitle')}</h1>
        <p className="max-w-3xl text-lg text-slate-600">{t('overviewIntro')}</p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        {documentKeys.map((key) => (
          <Link
            key={key}
            href={`/legal/${key}`}
            className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 group-hover:text-brand">{t(`documents.${key}.title`)}</h2>
              <p className="text-sm text-slate-600">{t(`documents.${key}.summary`)}</p>
            </div>
            <span className="mt-4 text-sm font-medium text-brand">{t('viewDetails')}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
