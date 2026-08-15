"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/features/i18n/provider";
import {
  loadRecentNotifications,
  loadUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/actions";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import type { HeaderNotifications } from "@/features/notifications/queries";
import type { NotificationListItem } from "@/features/notifications/types";

/**
 * §5 realtime: this codebase has no WebSocket/SSE/Supabase-Realtime channel
 * anywhere (verified — grepping the whole app for those turns up nothing),
 * so rather than stand up new realtime infrastructure for one feature, the
 * bell polls this one cheap, indexed COUNT query. Good enough for "shows up
 * within half a minute of being online" without a new moving part; the
 * badge/list still update instantly on the user's OWN actions (optimistic).
 */
const POLL_INTERVAL_MS = 30_000;

export function NotificationsMenu({ initial }: { initial: HeaderNotifications }) {
  const { messages } = useI18n();
  const t = messages.notifications;
  const [items, setItems] = useState<NotificationListItem[]>(initial.items);
  const [unreadCount, setUnreadCount] = useState(initial.unreadCount);
  const [isPending, startTransition] = useTransition();
  const hasUnread = unreadCount > 0;
  // Avoids a stale poll response clobbering a just-opened dropdown's fresher list.
  const openRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      loadUnreadNotificationCount()
        .then((count) => setUnreadCount(count))
        .catch(() => {
          // Transient network hiccup — next tick retries; nothing to show the
          // user for a background poll failure.
        });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    openRef.current = open;
    if (!open) return;
    loadRecentNotifications()
      .then((fresh) => {
        if (openRef.current) setItems(fresh);
      })
      .catch(() => {
        // Keep showing the last known-good list rather than blanking it.
      });
  }, []);

  const handleRead = useCallback(
    (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => {
        const wasUnread = items.find((n) => n.id === id)?.isRead === false;
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });
      startTransition(() => {
        void markNotificationRead(id);
      });
    },
    [items],
  );

  const handleMarkAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    startTransition(() => {
      void markAllNotificationsRead();
    });
  }, []);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.title} className="relative">
          <Bell className="size-4" />
          {hasUnread && (
            <span
              aria-hidden
              className="bg-primary ring-background absolute top-1.5 right-1.5 size-2 rounded-full ring-2"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t.title}</span>
          <span className="flex items-center gap-2">
            {hasUnread && (
              <span className="text-muted-foreground text-xs font-normal">
                {t.unreadCountLabel.replace("{count}", String(unreadCount > 99 ? "99+" : unreadCount))}
              </span>
            )}
            {hasUnread && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleMarkAllRead}
                className="text-primary text-xs font-normal hover:underline disabled:opacity-50"
              >
                {t.markAllRead}
              </button>
            )}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
          {items.length > 0 ? (
            items.map((n) => <NotificationItem key={n.id} notification={n} onRead={handleRead} />)
          ) : (
            <p className="text-muted-foreground px-2 py-6 text-center text-xs">{t.empty}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <Link
          href="/notifications"
          className="text-muted-foreground hover:text-foreground block px-2 py-1.5 text-center text-xs transition-colors"
        >
          {t.viewAll}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
