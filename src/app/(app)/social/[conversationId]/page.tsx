import { notFound } from "next/navigation";
import { ConversationPanel } from "@/features/social/components/conversation-panel";
import { MarkReadRefresh } from "@/features/social/components/mark-read-refresh";
import { MessageInput } from "@/features/social/components/message-input";
import { getConversation, markConversationRead } from "@/features/social/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await requireCurrentUser();
  const conversation = await getConversation(conversationId, user.id);
  if (!conversation) notFound();

  // Opening the thread marks it read, clearing its unread badge contribution.
  await markConversationRead(conversationId, user.id);

  const other = conversation.participants.find(
    (participant) => participant.userId !== user.id,
  )?.user;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">
        {other?.name ?? other?.email}
      </h1>
      <div className="flex flex-1 flex-col gap-4 rounded-lg border p-4">
        <ConversationPanel conversation={conversation} currentUserId={user.id} />
      </div>
      <MessageInput conversationId={conversationId} />
      <MarkReadRefresh />
    </div>
  );
}
