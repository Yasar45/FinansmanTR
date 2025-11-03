'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationCenter } from '@/components/notifications/notification-provider';
import { useTranslations } from 'next-intl';
import { formatDateTime } from '@/lib/formatters';

export function NotificationBell({ locale }: { locale: string }) {
  const { notifications, unreadCount, markAsRead, isLoading } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('common');

  const toggle = () => setOpen((state) => !state);

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex items-center justify-center rounded-full border border-transparent bg-emerald-100 p-2 text-emerald-700 transition hover:bg-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={toggle}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        )}
        <span className="sr-only">{t('notifications.open')}</span>
      </button>
      {open && (
        <div
          id="notification-panel"
          role="dialog"
          aria-modal="true"
          ref={panelRef}
          tabIndex={-1}
          className="absolute right-0 z-40 mt-3 w-80 max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl focus:outline-none"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{t('notifications.panelTitle')}</h2>
            <button
              type="button"
              className="text-xs font-medium text-emerald-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              disabled={unreadCount === 0}
              onClick={() => void markAsRead(notifications.filter((n) => !n.seenAt).map((n) => n.id))}
            >
              {t('notifications.markAllRead')}
            </button>
          </div>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto" role="list">
            {isLoading && <p className="text-sm text-slate-500">{t('notifications.loading')}</p>}
            {!isLoading && notifications.length === 0 && (
              <p className="text-sm text-slate-500">{t('notifications.empty')}</p>
            )}
            {notifications.map((notification) => (
              <article
                key={notification.id}
                role="listitem"
                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <p className="text-sm font-medium text-slate-800">
                  {t(`notifications.labels.${notification.type}`, { defaultMessage: notification.type })}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatDateTime(notification.createdAt, locale)}
                </p>
                {!notification.seenAt && (
                  <button
                    type="button"
                    onClick={() => void markAsRead([notification.id])}
                    className="mt-2 inline-flex items-center rounded-md border border-transparent bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    {t('notifications.markRead')}
                  </button>
                )}
              </article>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            onClick={() => setOpen(false)}
          >
            {t('notifications.close')}
          </button>
        </div>
      )}
    </div>
  );
}
