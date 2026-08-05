import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                <li key={conversation.id}>
                  <Link
                    href={`/social/${conversation.id}`}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    <Avatar className="size-8">
                      <AvatarImage
                        src={other?.image ?? undefined}
                        alt={other?.name ?? ""}
                      />
                      <AvatarFallback>
                        {(other?.name ?? other?.email ?? "?").at(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">
                        {other?.name ?? other?.email}
                      </span>
                      {lastMessage && (
                        <span className="text-muted-foreground truncate text-xs">
                          {lastMessage.content}
                        </span>
                      )}
                    </div>
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
