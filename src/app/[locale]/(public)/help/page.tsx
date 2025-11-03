import { getTranslations } from 'next-intl/server';

export default async function HelpPage() {
  const t = await getTranslations('common');
  const email = 'support@ciftlikpazar.tr';
  const faqKeys = ['howWorks', 'wallet', 'production'] as const;

  return (
    <main id="main-content" className="container-responsive space-y-16 py-16">
      <section className="space-y-6">
        <h1 className="text-4xl font-bold">{t('help.title', { defaultMessage: 'Yardım Merkezi' })}</h1>
        <p className="max-w-3xl text-lg text-slate-600">{t('help.intro')}</p>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold">{t('help.faqHeading')}</h2>
          <dl className="mt-6 space-y-4">
            {faqKeys.map((key) => (
              <div key={key}>
                <dt className="text-lg font-medium text-slate-900">{t(`help.faqs.${key}.question`)}</dt>
                <dd className="text-sm text-slate-600">{t(`help.faqs.${key}.answer`)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-sm text-slate-500">
          {t('help.contactPrefix')}
          <a href={`mailto:${email}`} className="text-brand">
            {email}
          </a>
          {t('help.contactSuffix')}
        </p>
      </section>
    </main>
  );
}
