"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markNotificationRead } from "@/features/notifications/actions";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import type { HeaderNotifications } from "@/features/notifications/queries";
import type { Messages } from "@/features/i18n/messages";

const PREVIEW_LIMIT = 5;

/**
 * Surfaces the SAME notification feed the header bell already shows —
 * friend requests, DMs, battle invites, system announcements — front and
 * center on the dashboard instead of tucked behind a dropdown. Reuses
 * NotificationItem as-is (icon-per-type, unread dot, relative time) so this
 * reads as the same product surface, not a parallel implementation.
 */
export function RecentActivityCard({
  initial,
  messages,
}: {
  initial: HeaderNotifications;
  messages: Messages;
}) {
  const t = messages.dashboard;
  const [items, setItems] = useState(initial.items.slice(0, PREVIEW_LIMIT));
  const [, startTransition] = useTransition();

  function handleRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    startTransition(() => {
      void markNotificationRead(id);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.recentActivityTitle}</CardTitle>
        <Link
          href="/notifications"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          {t.viewAll}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
            <Bell className="size-5 opacity-40" aria-hidden />
            {t.recentActivityEmpty}
          </div>
        ) : (
          items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={handleRead}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
