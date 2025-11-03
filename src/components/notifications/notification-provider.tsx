'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { Notification } from '@prisma/client';
import { useTranslations } from 'next-intl';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (ids: string[]) => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

async function fetchNotifications(locale?: string): Promise<Notification[]> {
  const response = await fetch('/api/notifications', {
    headers: locale ? { 'Accept-Language': locale } : undefined
  });
  if (response.status === 401) {
    return [];
  }
  if (!response.ok) {
    throw new Error('Failed to load notifications');
  }
  return response.json();
}

async function markNotificationsSeen(ids: string[]): Promise<void> {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
}

function formatNotification(t: ReturnType<typeof useTranslations<'common'>>, notification: Notification) {
  switch (notification.type) {
    case 'PRODUCTION_SUMMARY':
      return t('notifications.productionSummary');
    case 'PLOT_SUSPENDED':
      return t('notifications.plotSuspended');
    case 'WITHDRAWAL_APPROVED':
      return t('notifications.withdrawalApproved');
    case 'WITHDRAWAL_REJECTED':
      return t('notifications.withdrawalRejected');
    default:
      return t('notifications.generic');
  }
}

function ToastStack({ notifications, onDismiss }: { notifications: Notification[]; onDismiss: (id: string) => void }) {
  const t = useTranslations('common');
  return (
    <div aria-live="assertive" className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto rounded-lg border border-emerald-200 bg-white p-4 shadow-lg"
          role="status"
        >
          <p className="text-sm font-semibold text-emerald-700">{t('notifications.title')}</p>
          <p className="mt-1 text-sm text-slate-700">{formatNotification(t, notification)}</p>
          <button
            type="button"
            onClick={() => onDismiss(notification.id)}
            className="mt-3 inline-flex items-center rounded-md border border-transparent bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {t('notifications.dismiss')}
          </button>
        </div>
      ))}
    </div>
  );
}

export function NotificationProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const enabled = Boolean(session?.user.id);
  const t = useTranslations('common');
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(locale),
    enabled,
    refetchInterval: 15000,
    staleTime: 10_000
  });

  const markSeenMutation = useMutation({
    mutationFn: markNotificationsSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const notifications = notificationsQuery.data ?? [];
  const unread = useMemo(() => notifications.filter((notification) => !notification.seenAt), [notifications]);

  const [toastQueue, setToastQueue] = useState<Notification[]>([]);
  useEffect(() => {
    if (!enabled) {
      setToastQueue([]);
    }
  }, [enabled]);
  useEffect(() => {
    if (!unread.length) {
      return;
    }
    setToastQueue((queue) => {
      const existingIds = new Set(queue.map((item) => item.id));
      const newItems = unread.filter((item) => !existingIds.has(item.id));
      if (!newItems.length) {
        return queue;
      }
      return [...queue, ...newItems];
    });
  }, [unread]);

  const handleDismissToast = (id: string) => {
    setToastQueue((queue) => queue.filter((item) => item.id !== id));
    markSeenMutation.mutate([id]);
  };

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: unread.length,
      isLoading: notificationsQuery.isLoading,
      markAsRead: async (ids: string[]) => {
        if (!ids.length) return;
        await markSeenMutation.mutateAsync(ids);
      }
    }),
    [notifications, unread.length, notificationsQuery.isLoading, markSeenMutation]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {toastQueue.length > 0 && <ToastStack notifications={toastQueue} onDismiss={handleDismissToast} />}
    </NotificationContext.Provider>
  );
}

export function useNotificationCenter() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationProvider');
  }
  return context;
}
