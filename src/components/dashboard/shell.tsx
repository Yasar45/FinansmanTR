'use client';

import { signOut, useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { LocalizedLink, useLocalizedPathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/notification-bell';

const navKeys = [
  'nav.overview',
  'nav.animals',
  'nav.farming',
  'nav.inventory',
  'nav.marketplace',
  'nav.exchange',
  'nav.wallet',
  'nav.admin'
] as const;

const navHref = [
  '/dashboard',
  '/animals',
  '/farming',
  '/inventory',
  '/marketplace',
  '/exchange',
  '/wallet',
  '/admin'
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = useLocalizedPathname();
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const common = useTranslations('common');
  const { data } = useSession();
  const role = data?.user.role ?? 'USER';

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-700">
        {common('skipToContent', { defaultMessage: 'İçeriğe atla' })}
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="container-responsive flex h-16 items-center justify-between">
          <LocalizedLink href="/dashboard" className="text-lg font-semibold">
            {common('appName', { defaultMessage: 'Çiftlik Pazar' })}
          </LocalizedLink>
          <nav className="hidden items-center gap-4 md:flex" aria-label={t('primaryNav', { defaultMessage: 'Birincil gezinme' })}>
            {navHref.map((href, index) => {
              const isAdminOnly = href === '/admin';
              if (isAdminOnly && role !== 'ADMIN') {
                return null;
              }
              const label = t(navKeys[index], { defaultMessage: navKeys[index] });
              const active = pathname.startsWith(href);
              return (
                <LocalizedLink
                  key={href}
                  href={href}
                  className={cn(
                    'text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                    active && 'text-emerald-600'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </LocalizedLink>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <NotificationBell locale={locale} />
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
              {common('signOut', { defaultMessage: 'Çıkış' })}
            </Button>
          </div>
        </div>
      </header>
      <main id="main-content" className="container-responsive grid gap-8 py-10">
        {children}
      </main>
    </div>
  );
}
