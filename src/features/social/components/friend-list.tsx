import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { MessageFriendButton } from "@/features/social/components/message-friend-button";
import { RemoveFriendButton } from "@/features/social/components/remove-friend-button";
import type { getFriends } from "@/features/social/queries";

export function FriendList({
  friends,
}: {
  friends: Awaited<ReturnType<typeof getFriends>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>친구 목록</CardTitle>
      </CardHeader>
      <CardContent>
        {friends.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            아직 친구가 없어요. 이메일로 친구를 추가해보세요.
          </p>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
