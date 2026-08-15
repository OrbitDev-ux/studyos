"use client";

import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/features/i18n/provider";
import {
  loadNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/actions";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import type { NotificationPage } from "@/features/notifications/types";

/** Full history for /notifications — page-number pagination (skip/take),
 * matching the existing admin/logs convention rather than inventing a new
 * cursor/infinite-scroll pattern for this one screen. */
export function NotificationsList({ initial }: { initial: NotificationPage }) {
  const { messages } = useI18n();
  const t = messages.notifications;
  const [data, setData] = useState<NotificationPage>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const goToPage = useCallback((page: number) => {
    setError(false);
    startTransition(() => {
      loadNotificationsPage(page)
        .then(setData)
        .catch(() => setError(true));
    });
  }, []);

  const handleRead = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
    void markNotificationRead(id);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setData((prev) => ({ ...prev, rows: prev.rows.map((n) => ({ ...n, isRead: true })) }));
    void markAllNotificationsRead();
  }, []);

  const hasUnread = data.rows.some((n) => !n.isRead);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
        {hasUnread && (
          <Button type="button" variant="outline" size="sm" onClick={handleMarkAllRead}>
            {t.markAllRead}
          </Button>
        )}
      </div>

      {error ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-sm">
          <p>{t.errorLoad}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => goToPage(data.page)}>
            {messages.common.retry}
          </Button>
        </div>
      ) : data.rows.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-1 py-16 text-center">
          <p className="text-sm font-medium">{t.pageEmptyTitle}</p>
          <p className="text-xs">{t.pageEmptyDesc}</p>
        </div>
      ) : (
        <div className="divide-border flex flex-col divide-y rounded-lg border">
          {data.rows.map((n) => (
            <div key={n.id} className="px-1">
              <NotificationItem notification={n} onRead={handleRead} />
            </div>
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
          >
            {t.prevPage}
          </Button>
          <span className="text-muted-foreground text-xs">
            {data.page} / {data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || data.page >= data.totalPages}
            onClick={() => goToPage(data.page + 1)}
          >
            {t.nextPage}
          </Button>
        </div>
      )}
    </div>
  );
}
