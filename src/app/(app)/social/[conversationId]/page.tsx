import { notFound } from "next/navigation";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { deriveOnlineStatus } from "@/features/profile/presence";
import { ChatRoom } from "@/features/social/components/chat-room";
import { ConversationList } from "@/features/social/components/conversation-list";
import { ConversationLiveRefresh } from "@/features/social/components/conversation-live-refresh";
import {
  getConversation,
  getConversations,
  markConversationRead,
} from "@/features/social/queries";
import type { ChatConversation } from "@/features/social/components/message-panel";
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
  const [conversation, sidebarConversations] = await Promise.all([
    getConversation(conversationId, user.id),
    getConversations(user.id),
  ]);
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
  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).social;

  // Client-facing shape: Dates → ISO strings at this exact server/client
  // boundary (same explicit-serialization convention features/tutor's
  // conversation list already uses), since this whole subtree renders as
  // client components from here down (hover actions, edit/reply/typing state).
  const clientConversation: ChatConversation = {
    id: conversation.id,
    participants: conversation.participants.map((p) => ({
      userId: p.userId,
      lastReadAt: p.lastReadAt?.toISOString() ?? null,
      typingAt: p.typingAt?.toISOString() ?? null,
      user: {
        id: p.user.id,
        name: p.user.name,
        image: p.user.image,
        lastSeenAt: p.user.lastSeenAt?.toISOString() ?? null,
      },
    })),
    messages: conversation.messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      createdAt: m.createdAt.toISOString(),
      editedAt: m.editedAt?.toISOString() ?? null,
      deletedAt: m.deletedAt?.toISOString() ?? null,
      replyTo: m.replyTo && {
        id: m.replyTo.id,
        content: m.replyTo.content,
        deletedAt: m.replyTo.deletedAt?.toISOString() ?? null,
        sender: m.replyTo.sender,
      },
      reactions: m.reactions,
      sharedProblem: m.sharedProblem,
    })),
  };

  return (
    <div className="flex flex-1 flex-col gap-4 md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
      <div className="hidden md:block">
        <ConversationList
          conversations={sidebarConversations}
          currentUserId={user.id}
          locale={locale}
          t={t}
        />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {other ? (
          <div className="flex items-center gap-2">
            <ProfileNameplate
              userId={other.id}
              name={other.name}
              image={other.image}
              fallbackLabel={other.email}
              status={deriveOnlineStatus(other.lastSeenAt)}
              nameClassName="text-xl font-semibold tracking-tight"
              avatarClassName="size-9"
            />
          </div>
        ) : (
          <h1 className="text-xl font-semibold tracking-tight">{t.unknownUser}</h1>
        )}
        <div className="flex flex-1 flex-col rounded-lg border p-4">
          <ChatRoom conversation={clientConversation} currentUserId={user.id} />
        </div>
        <ConversationLiveRefresh />
      </div>
    </div>
  );
}
