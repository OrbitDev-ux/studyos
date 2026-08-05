import type { getConversation } from "@/features/social/queries";
import { cn } from "@/lib/utils";

export function ConversationPanel({
  conversation,
  currentUserId,
}: {
  conversation: NonNullable<Awaited<ReturnType<typeof getConversation>>>;
  currentUserId: string;
}) {
  if (conversation.messages.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        아직 메시지가 없어요. 첫 메시지를 보내보세요.
      </p>
    );
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
