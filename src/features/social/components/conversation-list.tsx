import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import type { getConversations } from "@/features/social/queries";

export function ConversationList({
  conversations,
  currentUserId,
}: {
  conversations: Awaited<ReturnType<typeof getConversations>>;
  currentUserId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>대화</CardTitle>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 대화가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {conversations.map((conversation) => {
              const other = conversation.participants.find(
                (participant) => participant.userId !== currentUserId,
              )?.user;
              const lastMessage = conversation.messages[0];
              return (
                <li key={conversation.id} className="flex items-center gap-2">
                  {/* Clicking the avatar/name opens the profile card; clicking
                      the message area opens the conversation. */}
                  {other && (
                    <ProfileNameplate
                      userId={other.id}
                      name={other.name}
                      image={other.image}
                      fallbackLabel={other.email}
                    />
                  )}
                  <Link
                    href={`/social/${conversation.id}`}
                    className="flex min-w-0 flex-1 flex-col hover:opacity-80"
                    aria-label="대화 열기"
                  >
                    <span className="text-muted-foreground truncate text-xs">
                      {lastMessage ? lastMessage.content : "대화 열기"}
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
