import {
  Bell,
  LifeBuoy,
  MessageCircle,
  Swords,
  UserPlus,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "@/features/i18n/messages";
import type { NotificationListItem, NotificationType } from "@/features/notifications/types";

/** Icon + semantic tone (brand color tokens, matching the rest of the design
 * system) per notification type. */
export const NOTIFICATION_ICON: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  friend_request: { icon: UserPlus, tone: "text-primary bg-primary/12" },
  friend_request_accepted: { icon: UserCheck, tone: "text-success bg-success/12" },
  dm_message: { icon: MessageCircle, tone: "text-primary bg-primary/12" },
  support_reply: { icon: LifeBuoy, tone: "text-info bg-info/12" },
  battle_invite: { icon: Swords, tone: "text-warning-foreground bg-warning/15" },
  battle_invite_response: { icon: Swords, tone: "text-warning-foreground bg-warning/15" },
  system_announcement: { icon: Bell, tone: "text-primary bg-primary/12" },
};

function actorNameFrom(metadata: unknown, fallback: string): string {
  if (metadata && typeof metadata === "object" && "actorName" in metadata) {
    const value = (metadata as { actorName?: unknown }).actorName;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

/**
 * Resolves the display title/body for a notification IN THE VIEWER'S CURRENT
 * LOCALE. Built-in (non-admin) notification types store only structured
 * `metadata` (e.g. `actorName`) at creation time — never a rendered string —
 * so the same row reads correctly no matter which locale the viewer has
 * chosen, unlike baking a rendered sentence into the DB row at write time
 * (which would freeze it to whatever locale the *actor's* request happened
 * to run in). `system_announcement` is the one exception: it is admin-
 * authored free text with no i18n treatment (same as the Announcement model
 * it comes from), so `title`/`body` are shown as-is.
 */
export function resolveNotificationText(
  t: Messages["notifications"],
  notification: Pick<NotificationListItem, "type" | "title" | "body" | "metadata">,
): { title: string; body: string | null } {
  const name = actorNameFrom(notification.metadata, t.someone);

  switch (notification.type) {
    case "friend_request":
      return { title: t.friendRequestTitle.replace("{name}", name), body: null };
    case "friend_request_accepted":
      return { title: t.friendRequestAcceptedTitle.replace("{name}", name), body: null };
    case "dm_message":
      return { title: t.dmMessageTitle.replace("{name}", name), body: notification.body };
    case "support_reply":
      return { title: t.supportReplyTitle, body: notification.body };
    case "battle_invite":
      return { title: t.battleInviteTitle.replace("{name}", name), body: null };
    case "battle_invite_response": {
      const accepted =
        !!notification.metadata &&
        typeof notification.metadata === "object" &&
        (notification.metadata as { accepted?: unknown }).accepted === true;
      return {
        title: (accepted ? t.battleInviteAcceptedTitle : t.battleInviteDeclinedTitle).replace(
          "{name}",
          name,
        ),
        body: null,
      };
    }
    case "system_announcement":
      return { title: notification.title, body: notification.body };
    default:
      return { title: notification.title, body: notification.body };
  }
}
