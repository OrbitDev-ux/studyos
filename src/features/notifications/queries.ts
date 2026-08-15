import "server-only";
import { getRecentNotifications, getUnreadCount } from "@/features/notifications/service";
import type { NotificationListItem } from "@/features/notifications/types";

export type HeaderNotifications = {
  items: NotificationListItem[];
  unreadCount: number;
};

/** What the (app) layout needs for the header bell: the latest handful of
 * rows for the dropdown, plus a cheap indexed unread count for the badge —
 * fetched in parallel, both scoped to the current user. */
export async function getHeaderNotifications(userId: string): Promise<HeaderNotifications> {
  const [items, unreadCount] = await Promise.all([
    getRecentNotifications(userId),
    getUnreadCount(userId),
  ]);
  return { items, unreadCount };
}
