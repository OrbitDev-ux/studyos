import { notFound } from "next/navigation";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { ConversationLiveRefresh } from "@/features/social/components/conversation-live-refresh";
import { ConversationPanel } from "@/features/social/components/conversation-panel";
import { MessageInput } from "@/features/social/components/message-input";
import { getConversation, markConversationRead } from "@/features/social/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { markAsReadByTarget } from "@/features/notifications/service";
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
  await markAsReadByTarget(
    user.id,
    "dm_message",
    (metadata) =>
      !!metadata &&
      typeof metadata === "object" &&
      (metadata as { conversationId?: unknown }).conversationId === conversationId,
  );

  const other = conversation.participants.find(
    (participant) => participant.userId !== user.id,
  )?.user;
  const t = getMessages(await getServerLocale(user.locale)).social;

  return (
    <div className="flex flex-col gap-4">
      {other ? (
        <ProfileNameplate
          userId={other.id}
          name={other.name}
          image={other.image}
          fallbackLabel={other.email}
          nameClassName="text-xl font-semibold tracking-tight"
          avatarClassName="size-9"
        />
      ) : (
        <h1 className="text-xl font-semibold tracking-tight">{t.unknownUser}</h1>
      )}
      <div className="flex flex-1 flex-col gap-4 rounded-lg border p-4">
        <ConversationPanel conversation={conversation} currentUserId={user.id} t={t} />
      </div>
      <MessageInput conversationId={conversationId} />
      <ConversationLiveRefresh />
    </div>
  );
}
