import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { deriveOnlineStatus } from "@/features/profile/presence";
import type { getConversations } from "@/features/social/queries";
import type { Messages } from "@/features/i18n/messages";
import type { Locale } from "@/features/i18n/config";
import { formatRelativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";

export function ConversationList({
  conversations,
  currentUserId,
  locale,
  t,
}: {
  conversations: Awaited<ReturnType<typeof getConversations>>;
  currentUserId: string;
  locale: Locale;
  t: Messages["social"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.conversationsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.conversationsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {conversations.map((conversation) => {
              const other = conversation.participants.find(
                (participant) => participant.userId !== currentUserId,
              )?.user;
              const lastMessage = conversation.messages[0];
              const preview = lastMessage
                ? lastMessage.deletedAt
                  ? t.deletedTag
                  : lastMessage.content ||
                    (lastMessage.sharedType === "PROBLEM" ? t.sharedProblemPreview : "")
                : t.openConversation;
              const unread = conversation.unreadCount > 0;

              return (
                <li key={conversation.id} className="flex items-center gap-2">
                  {/* Clicking the avatar/name opens the profile card; clicking
                      the rest of the row opens the conversation. */}
                  {other && (
                    <ProfileNameplate
                      userId={other.id}
                      name={other.name}
                      image={other.image}
                      fallbackLabel={other.email}
                      status={deriveOnlineStatus(other.lastSeenAt)}
                    />
                  )}
                  <Link
                    href={`/social/${conversation.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-1 py-1.5 hover:opacity-80"
                    aria-label={t.openConversation}
                  >
                    <span
                      className={cn(
                        "text-muted-foreground truncate text-xs",
                        unread && "text-foreground font-medium",
                      )}
                    >
                      {preview}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {lastMessage && (
                        <span className="text-muted-foreground text-[10px]">
                          {formatRelativeTime(new Date(lastMessage.createdAt), locale)}
                        </span>
                      )}
                      {unread && (
                        <Badge variant="default" className="h-4.5 min-w-4.5 justify-center px-1">
                          {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                        </Badge>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
