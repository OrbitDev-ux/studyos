import { notFound } from "next/navigation";
import { ConversationPanel } from "@/features/social/components/conversation-panel";
import { MessageInput } from "@/features/social/components/message-input";
import { getConversation } from "@/features/social/queries";
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
    </div>
  );
}
