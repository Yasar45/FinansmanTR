'use client';

import { HelpCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LocalizedLink } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

interface InfoPopoverProps {
  title: string;
  description: string;
  learnHref?: string;
  learnLabel?: string;
}

export function InfoPopover({ title, description, learnHref, learnLabel }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('common');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center justify-center rounded-full border border-transparent bg-emerald-50 p-1 text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        onClick={() => setOpen((state) => !state)}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{title}</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          className="absolute right-0 z-40 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-lg"
        >
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-2 text-xs text-slate-600">{description}</p>
          {learnHref && learnLabel && (
            <LocalizedLink
              href={learnHref}
              className="mt-3 inline-flex items-center text-xs font-medium text-emerald-600 underline-offset-2 hover:underline"
            >
              {learnLabel}
            </LocalizedLink>
          )}
          <button
            type="button"
            className="mt-3 inline-flex items-center text-xs font-medium text-slate-500 underline-offset-2 hover:underline"
            onClick={() => setOpen(false)}
          >
            {t('close', { defaultMessage: 'Kapat' })}
          </button>
        </div>
      )}
    </div>
  );
}
