import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                    <AvatarFallback>{(user.name ?? user.email).at(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user.name ?? user.email}</span>
                </div>
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
