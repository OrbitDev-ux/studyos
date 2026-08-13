import { notFound } from "next/navigation";
import { TutorChat } from "@/features/tutor/components/tutor-chat";
import { getTutorConversation, getTutorConversations } from "@/features/tutor/queries";
import { requireCurrentUser } from "@/lib/session";

// The tutor AI turn runs inside a Server Action; give it room past the default.
export const maxDuration = 60;

export default async function TutorConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await requireCurrentUser();

  // Ownership is the WHERE clause — another user's id returns null → 404.
  const [conversation, all] = await Promise.all([
    getTutorConversation(conversationId, user.id),
    getTutorConversations(user.id),
  ]);
  if (!conversation) notFound();

  return (
    <TutorChat
      conversation={{
        id: conversation.id,
        subject: conversation.subject,
        grade: conversation.grade,
        title: conversation.title,
      }}
      initialMessages={conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }))}
      conversations={all.map((c) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        updatedAt: c.updatedAt.toISOString(),
      }))}
    />
  );
}
