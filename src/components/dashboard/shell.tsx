'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';

const navItems = [
  { href: '/dashboard', label: 'Özet' },
  { href: '/animals', label: 'Hayvanlar' },
  { href: '/farming', label: 'Sera & Hidroponik' },
  { href: '/inventory', label: 'Envanter' },
  { href: '/marketplace', label: 'Pazar Yeri' },
  { href: '/exchange', label: 'Borsa' },
  { href: '/wallet', label: 'Cüzdan' },
  { href: '/admin', label: 'Yönetim', adminOnly: true }
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = data?.user.role ?? "USER";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-responsive flex h-16 items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold">
            Çiftlik Pazar
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            {navItems
              .filter((item) => !item.adminOnly || role === "ADMIN")
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium text-slate-600 transition hover:text-slate-900',
                    pathname.startsWith(item.href) && 'text-brand'
                  )}
                >
                  {item.label}
                </Link>
              ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
              Çıkış
            </Button>
          </div>
        </div>
      </header>
      <div className="container-responsive grid gap-8 py-10">{children}</div>
    </div>
  );
}
