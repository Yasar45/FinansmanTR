import '@total-typescript/ts-reset';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/app/providers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { locales, defaultLocale, type AppLocale } from '@/i18n/routing';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'Çiftlik Pazar | FarmHub TR',
  description:
    'Türkiye odaklı dijital çiftlik ekonomisi: hayvanlar, seralar, pazar ve güvenli TRY cüzdanı.',
  metadataBase: new URL('https://example.com'),
  alternates: {
    languages: {
      tr: 'https://example.com/tr',
      en: 'https://example.com/en'
    }
  }
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function resolveHtmlLocale(locale: AppLocale) {
  return locale === 'en' ? 'en-US' : 'tr-TR';
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = (params.locale ?? defaultLocale) as AppLocale;

  if (!locales.includes(locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <html lang={resolveHtmlLocale(locale)} suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-700"
        >
          {t('skipToContent', { defaultMessage: 'İçeriğe atla' })}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
          <Providers locale={locale}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
