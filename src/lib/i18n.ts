export const defaultLocale = 'tr-TR';
export const locales = ['tr-TR', 'en-US'] as const;

export function translate(key: string, locale: string = defaultLocale): string {
  const dictionary = dictionaries[locale] ?? dictionaries[defaultLocale];
  return dictionary[key] ?? key;
}

const dictionaries: Record<string, Record<string, string>> = {
  'tr-TR': {
    dashboard: 'Kontrol Paneli',
    wallet: 'Cüzdan'
  },
  'en-US': {
    dashboard: 'Dashboard',
    wallet: 'Wallet'
  }
};
