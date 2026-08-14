import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import type { getConversations } from "@/features/social/queries";
import type { Messages } from "@/features/i18n/messages";

export function ConversationList({
  conversations,
  currentUserId,
  t,
}: {
  conversations: Awaited<ReturnType<typeof getConversations>>;
  currentUserId: string;
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
                    aria-label={t.openConversation}
                  >
                    <span className="text-muted-foreground truncate text-xs">
                      {lastMessage ? lastMessage.content : t.openConversation}
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
