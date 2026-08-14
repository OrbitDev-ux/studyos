import type { getConversation } from "@/features/social/queries";
import type { Messages } from "@/features/i18n/messages";
import { cn } from "@/lib/utils";

export function ConversationPanel({
  conversation,
  currentUserId,
  t,
}: {
  conversation: NonNullable<Awaited<ReturnType<typeof getConversation>>>;
  currentUserId: string;
  t: Messages["social"];
}) {
  if (conversation.messages.length === 0) {
    return <p className="text-muted-foreground text-sm">{t.panelEmpty}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {conversation.messages.map((message) => {
        const isMine = message.senderId === currentUserId;
        return (
          <div
            key={message.id}
            className={cn("flex", isMine ? "justify-end" : "justify-start")}
          >
            <p
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm break-words",
                isMine ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {message.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
