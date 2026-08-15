/**
 * Central notification model (features/notifications). `type` is a plain
 * string union — not a Postgres enum — matching this codebase's convention
 * for fields expected to grow (Friendship.status, Battle.metric,
 * TutorMessage.role): a new notification type is a TS change here, never a
 * migration (see prisma/schema.prisma's Notification model doc comment).
 *
 * Display text for the built-in (non-admin) types is NOT baked into the DB
 * row at creation time — only structured `metadata` is — so a notification
 * renders in whichever locale the *viewer* is currently using, not whichever
 * locale happened to be active when the actor triggered it. See
 * `resolveNotificationText` in meta.ts. `system_announcement` is the one
 * exception: its title/body are admin-authored free text, shown as-is (the
 * existing Announcement model has no i18n treatment either).
 */
export type NotificationType =
  | "friend_request"
  | "friend_request_accepted"
  | "dm_message"
  | "support_reply"
  | "battle_invite"
  | "battle_invite_response"
  | "system_announcement";

/** Preference categories exposed in Settings (§6 of the spec: DM/Friend/Study/System). */
export type NotificationCategory = "dm" | "friend" | "study" | "system";

export const NOTIFICATION_CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  friend_request: "friend",
  friend_request_accepted: "friend",
  dm_message: "dm",
  support_reply: "system",
  battle_invite: "study",
  battle_invite_response: "study",
  system_announcement: "system",
};

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = ["dm", "friend", "study", "system"];

/** Opt-out preferences: a missing/undefined key means enabled. Never omit a
 * category by defaulting it to `false` anywhere — that would silently mute a
 * brand-new category for every existing user the moment it ships. */
export type NotificationPreferences = Partial<Record<NotificationCategory, boolean>>;

/** One row as read back for display — the shape both the header dropdown and
 * the full /notifications page render. */
export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  targetUrl: string | null;
  metadata: unknown;
  createdAt: Date;
};

export type NotificationPage = {
  rows: NotificationListItem[];
  total: number;
  page: number;
  totalPages: number;
};
