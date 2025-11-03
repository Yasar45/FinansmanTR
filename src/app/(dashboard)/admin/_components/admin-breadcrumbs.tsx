import Link from 'next/link';

export function AdminBreadcrumbs() {
  const crumbs = [
    { href: '/dashboard', label: 'Panel' },
    { href: '/admin', label: 'Yönetim' }
  ];

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <Link
              href={crumb.href}
              className="rounded px-1 py-0.5 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {crumb.label}
            </Link>
            {index < crumbs.length - 1 ? <span className="text-slate-400">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
