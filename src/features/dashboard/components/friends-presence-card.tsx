import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { deriveOnlineStatus } from "@/features/profile/presence";
import type { getFriends } from "@/features/social/queries";
import type { Messages } from "@/features/i18n/messages";

const PREVIEW_LIMIT = 6;

/**
 * Reuses the existing friendship/presence systems as-is — getFriends() for
 * the list, deriveOnlineStatus(lastSeenAt) for status, ProfileNameplate for
 * the avatar+name+profile-card entry point already used everywhere else in
 * the app. Online friends sort first so the "who can I study with right
 * now" answer is immediately visible without a separate filter control.
 */
export function FriendsPresenceCard({
  friends,
  pendingRequestCount,
  messages,
}: {
  friends: Awaited<ReturnType<typeof getFriends>>;
  pendingRequestCount: number;
  messages: Messages;
}) {
  const t = messages.social;
  const dt = messages.dashboard;

  const withStatus = friends.map((friend) => ({
    ...friend,
    status: deriveOnlineStatus(friend.user.lastSeenAt),
  }));
  const rank = { ONLINE: 0, IDLE: 1, OFFLINE: 2 } as const;
  const sorted = [...withStatus].sort((a, b) => rank[a.status] - rank[b.status]);
  const onlineCount = withStatus.filter((f) => f.status === "ONLINE").length;
  const statusLabel = { ONLINE: t.statusOnline, IDLE: t.statusIdle, OFFLINE: t.statusOffline };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {dt.friendsTitle}
          {pendingRequestCount > 0 && (
            <Badge variant="default" className="h-4.5 min-w-4.5 justify-center px-1">
              {pendingRequestCount}
            </Badge>
          )}
        </CardTitle>
        <Link
          href="/social"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          {dt.viewAll}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {friends.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
            <Users className="size-5 opacity-40" aria-hidden />
            {dt.friendsEmpty}
          </div>
        ) : (
          <>
            {onlineCount > 0 && (
              <p className="text-muted-foreground mb-1 text-xs">
                {dt.friendsOnlineCount.replace("{count}", String(onlineCount))}
              </p>
            )}
            <ul className="flex flex-col gap-2.5">
              {sorted.slice(0, PREVIEW_LIMIT).map((friend) => (
                <li key={friend.friendshipId} className="flex items-center justify-between gap-2">
                  <ProfileNameplate
                    userId={friend.user.id}
                    name={friend.user.name}
                    image={friend.user.image}
                    fallbackLabel={friend.user.email}
                    status={friend.status}
                  />
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {statusLabel[friend.status]}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
