"use client";

import Link from "next/link";
import { useI18n } from "@/features/i18n/provider";
import { formatRelativeTime } from "@/lib/date";
import { resolveNotificationText, NOTIFICATION_ICON } from "@/features/notifications/meta";
import type { NotificationListItem } from "@/features/notifications/types";
import { cn } from "@/lib/utils";

/**
 * One row, shared by the header dropdown and the full /notifications page so
 * both read as the same product surface. Clicking anywhere on the row marks
 * it read (fire-and-forget, `onRead` is expected to be optimistic) and — when
 * `targetUrl` is set — navigates there (§9: DM→conversation, friend request→
 * /social, battle→/battle/:id; a broadcast announcement has no target and
 * just marks read in place).
 */
export function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationListItem;
  onRead: (id: string) => void;
}) {
  const { messages, locale } = useI18n();
  const t = messages.notifications;
  const { title, body } = resolveNotificationText(t, notification);
  const { icon: Icon, tone } = NOTIFICATION_ICON[notification.type];
  const time = formatRelativeTime(notification.createdAt, locale);

  const content = (
    <>
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", tone)}>
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm",
            notification.isRead ? "text-foreground font-normal" : "text-foreground font-medium",
          )}
        >
          {title}
        </span>
        {body && <span className="text-muted-foreground line-clamp-2 text-xs">{body}</span>}
        <span className="text-muted-foreground text-[11px]">{time}</span>
      </span>
      {!notification.isRead && (
        <span aria-hidden className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
      )}
    </>
  );

  const rowClassName = "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left";

  if (notification.targetUrl) {
    return (
      <Link
        href={notification.targetUrl}
        onClick={() => onRead(notification.id)}
        className={cn(rowClassName, "hover:bg-accent transition-colors")}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onRead(notification.id)}
      className={cn(rowClassName, "hover:bg-accent cursor-default transition-colors")}
    >
      {content}
    </button>
  );
}
