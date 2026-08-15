"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/session";
import {
  deleteNotification as deleteNotificationRow,
  getNotificationPreferences,
  getNotifications,
  getRecentNotifications,
  getUnreadCount,
  markAllAsRead as markAllAsReadRow,
  markAsRead as markAsReadRow,
  updateNotificationPreferences,
} from "@/features/notifications/service";
import { notificationPreferencesSchema } from "@/features/notifications/schema";
import type {
  NotificationListItem,
  NotificationPage,
  NotificationPreferences,
} from "@/features/notifications/types";

/**
 * User-facing mutations. Every one re-derives the current user server-side
 * (`requireCurrentUser`) and passes it into the service's `where` clause —
 * a client can pass any notificationId it wants, it can never touch a row
 * that isn't its own (§7).
 */

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await requireCurrentUser();
  await markAsReadRow(notificationId, user.id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireCurrentUser();
  await markAllAsReadRow(user.id);
  revalidatePath("/", "layout");
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const user = await requireCurrentUser();
  await deleteNotificationRow(notificationId, user.id);
  revalidatePath("/", "layout");
}

/**
 * §5 realtime: no WebSocket/SSE infra exists in this app (see the module doc
 * in components/layout/notifications-menu.tsx), so the header bell stays
 * fresh via lightweight client-side polling of these two read-only actions
 * instead — cheap indexed count for the poll tick, full list only refetched
 * when the dropdown is actually opened.
 */
export async function loadUnreadNotificationCount(): Promise<number> {
  const user = await requireCurrentUser();
  return getUnreadCount(user.id);
}

export async function loadRecentNotifications(): Promise<NotificationListItem[]> {
  const user = await requireCurrentUser();
  return getRecentNotifications(user.id);
}

/** Paginated history for the /notifications page — a Server Action (not a
 * plain query import) so the client "더 보기"/page-nav can call it directly
 * without a full navigation, while still re-checking the session per call. */
export async function loadNotificationsPage(page: number): Promise<NotificationPage> {
  const user = await requireCurrentUser();
  return getNotifications(user.id, page);
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const user = await requireCurrentUser();
  return getNotificationPreferences(user.id);
}

export async function saveNotificationPreferences(
  input: NotificationPreferences,
): Promise<{ ok?: true; error?: string }> {
  const user = await requireCurrentUser();
  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) return { error: "설정값이 올바르지 않습니다." };
  await updateNotificationPreferences(user.id, parsed.data);
  revalidatePath("/settings");
  return { ok: true };
}
