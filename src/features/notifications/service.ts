import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { chunk, isCategoryEnabled } from "@/features/notifications/service-core";
import { parseNotificationPreferences } from "@/features/notifications/schema";
import {
  NOTIFICATION_CATEGORY_BY_TYPE,
  type NotificationListItem,
  type NotificationPage,
  type NotificationPreferences,
  type NotificationType,
} from "@/features/notifications/types";

/**
 * Central notification service (§2 of the spec) — every feature that wants to
 * notify a user goes through `createNotification`/`createNotifications` here
 * instead of writing to the Notification table directly. Mutations that
 * belong to a specific user (`markAsRead`, `markAllAsRead`, `deleteNotification`,
 * preferences) always take that user's id explicitly and put it in the
 * Prisma `where` — never trust a caller-supplied ownership claim (§7).
 *
 * `createNotification`/`createNotifications` are intentionally NOT exported
 * as Server Actions anywhere (no "use server" file re-exports them for
 * client use) — the only way to reach them is from other server-side code
 * (another feature's Server Action, itself already auth-checked), which is
 * what keeps "일반 사용자가 임의로 알림 생성 불가" true by construction rather
 * than by a runtime check this module would have to invent.
 */

const DROPDOWN_LIMIT = 8;
const PAGE_SIZE = 20;
const BULK_CHUNK_SIZE = 500;

const LIST_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  isRead: true,
  targetUrl: true,
  metadata: true,
  createdAt: true,
} as const;

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actorId?: string;
  targetUrl?: string;
  metadata?: Record<string, unknown>;
};

function toCreateData(input: CreateNotificationInput) {
  return {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    actorId: input.actorId ?? null,
    targetUrl: input.targetUrl ?? null,
    metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

/** Create one notification, honoring the recipient's category preference.
 * Silently no-ops if the recipient doesn't exist (defensive — never let a
 * notification side-effect fail the caller's primary action) or has that
 * category disabled. */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const recipient = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { notificationPreferences: true },
  });
  if (!recipient) return;
  const prefs = parseNotificationPreferences(recipient.notificationPreferences);
  if (!isCategoryEnabled(prefs, NOTIFICATION_CATEGORY_BY_TYPE[input.type])) return;

  await prisma.notification.create({ data: toCreateData(input) });
}

/** Bulk create (fan-out to several recipients, e.g. a battle invite to N
 * friends, or a system-wide announcement to every user). One `findMany` to
 * resolve which recipients still exist + their preferences, then chunked
 * `createMany` calls — never one create() per recipient (§8 N+1 avoidance),
 * never one unbounded query for a very large recipient list. */
export async function createNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;

  const userIds = Array.from(new Set(inputs.map((i) => i.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, notificationPreferences: true },
  });
  const prefsByUserId = new Map(
    users.map((u) => [u.id, parseNotificationPreferences(u.notificationPreferences)]),
  );

  const rows = inputs
    .filter((input) => {
      if (!prefsByUserId.has(input.userId)) return false; // recipient no longer exists
      return isCategoryEnabled(prefsByUserId.get(input.userId), NOTIFICATION_CATEGORY_BY_TYPE[input.type]);
    })
    .map(toCreateData);

  for (const batch of chunk(rows, BULK_CHUNK_SIZE)) {
    await prisma.notification.createMany({ data: batch });
  }
}

/** Broadcast to every user (admin announcements only — §3 "Admin 공지"). A
 * thin wrapper so call sites read as intentional broadcasts, not a generic
 * bulk call that happens to target everyone. */
export async function broadcastToAllUsers(
  input: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true } });
  await createNotifications(users.map((u) => ({ ...input, userId: u.id })));
}

/** Latest notifications for the header bell dropdown — no pagination, just
 * the most recent handful. */
export function getRecentNotifications(userId: string): Promise<NotificationListItem[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: DROPDOWN_LIMIT,
    select: LIST_SELECT,
  }) as Promise<NotificationListItem[]>;
}

/** Paginated history for the full /notifications page. */
export async function getNotifications(userId: string, page = 1): Promise<NotificationPage> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const [total, rows] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: LIST_SELECT,
    }),
  ]);
  return {
    rows: rows as NotificationListItem[],
    total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Cheap indexed count for the bell badge — never loads the rows themselves. */
export function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

/** Mark one notification read. `userId` MUST be the server-verified current
 * user (§7) — the `where` clause is what makes another user's notificationId
 * unreachable, not a prior "does this belong to me" read. */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { id: notificationId, userId } });
}

/**
 * Mark every unread notification of `type` for `userId` whose metadata
 * matches `predicate` as read — e.g. "the DM notifications for this
 * conversation" when the user opens it, or "the friend-request notification
 * for this friendship" when it's responded to. Scoped to a small per-user,
 * per-type row set (indexed by [userId, type, createdAt]), so filtering by
 * metadata in application code stays cheap at this app's scale.
 */
export async function markAsReadByTarget(
  userId: string,
  type: NotificationType,
  predicate: (metadata: unknown) => boolean,
): Promise<void> {
  const candidates = await prisma.notification.findMany({
    where: { userId, type, isRead: false },
    select: { id: true, metadata: true },
  });
  const ids = candidates.filter((c) => predicate(c.metadata)).map((c) => c.id);
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });
  return parseNotificationPreferences(user?.notificationPreferences);
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { notificationPreferences: preferences as Prisma.InputJsonValue },
  });
}
