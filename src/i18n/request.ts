import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/routing';

const namespaces = ['common', 'auth', 'dashboard', 'marketplace', 'exchange', 'admin', 'legal'] as const;

type Namespace = (typeof namespaces)[number];

async function loadMessages(locale: string, namespace: Namespace) {
  try {
    return (await import(`@/messages/${locale}/${namespace}.json`)).default;
  } catch (error) {
    if (locale !== defaultLocale) {
      return loadMessages(defaultLocale, namespace);
    }
    throw error;
  }
}

export default getRequestConfig(async ({ locale }) => {
  const normalized = locales.includes(locale as (typeof locales)[number]) ? (locale as string) : defaultLocale;

  const entries = await Promise.all(
    namespaces.map(async (namespace) => [namespace, await loadMessages(normalized, namespace)])
  );

  return {
    messages: Object.fromEntries(entries)
  };
});
