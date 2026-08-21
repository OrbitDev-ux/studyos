import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { BlockUserButton } from "@/features/social/components/block-user-button";
import { MessageFriendButton } from "@/features/social/components/message-friend-button";
import { RemoveFriendButton } from "@/features/social/components/remove-friend-button";
import type { getFriends } from "@/features/social/queries";
import type { Messages } from "@/features/i18n/messages";

export function FriendList({
  friends,
  t,
}: {
  friends: Awaited<ReturnType<typeof getFriends>>;
  t: Messages["social"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.friendListTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {friends.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.friendListEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {friends.map(({ friendshipId, user }) => (
              <li key={friendshipId} className="flex items-center justify-between gap-2">
                <ProfileNameplate
                  userId={user.id}
                  name={user.name}
                  image={user.image}
                  fallbackLabel={user.email}
                />
                <div className="flex items-center gap-1">
                  <MessageFriendButton friendUserId={user.id} />
                  <RemoveFriendButton friendshipId={friendshipId} />
                  <BlockUserButton targetUserId={user.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
