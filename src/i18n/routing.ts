import { createLocalizedPathnamesNavigation, type Pathnames } from 'next-intl/navigation';

export const locales = ['tr', 'en'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'tr';

export const localePrefix = 'as-needed';

export const pathnames: Pathnames<AppLocale> = {
  '/': '/',
  '/auth/sign-in': '/auth/sign-in',
  '/auth/sign-up': '/auth/sign-up',
  '/help': '/help',
  '/legal': '/legal',
  '/legal/terms': '/legal/terms',
  '/legal/privacy': '/legal/privacy',
  '/legal/risk': '/legal/risk',
  '/legal/cookies': '/legal/cookies',
  '/dashboard': '/dashboard',
  '/animals': '/animals',
  '/farming': '/farming',
  '/inventory': '/inventory',
  '/marketplace': '/marketplace',
  '/exchange': '/exchange',
  '/wallet': '/wallet',
  '/admin': '/admin'
};

export const { Link: LocalizedLink, redirect: localizedRedirect, usePathname: useLocalizedPathname, useRouter: useLocalizedRouter } =
  createLocalizedPathnamesNavigation({
    locales,
    defaultLocale,
    localePrefix,
    pathnames
  });
