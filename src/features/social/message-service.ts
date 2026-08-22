import { createNotification } from "@/features/notifications/service";
import { prisma } from "@/lib/prisma";

/**
 * Shared message-creation core for sendMessage/shareProblem. Deliberately
 * NOT a "use server" export: every top-level export of a "use server" file
 * becomes independently callable from the client, and this function trusts
 * its `sender` argument completely (no auth check of its own) — exporting it
 * as a Server Action would let a client construct an arbitrary `sender` and
 * post messages as anyone. It may only be reached through an actual Server
 * Action (sendMessage/shareProblem) that has already called
 * requireCurrentUser() and passes in the verified session user — the same
 * "service function trusts its caller, the action re-verifies" split this
 * codebase already uses for recordProblemAttempt/registerWrongAnswerForReview.
 */

const MAX_MESSAGE_LENGTH = 1000;
const NOTIFICATION_PREVIEW_LENGTH = 120;

// Rate limit — same query-based, no-new-table approach as the login rate
// limit (lib/auth.ts): count this sender's own recent messages rather than
// standing up a shared rate-limiter/dependency for a friends-only DM surface.
const MESSAGE_RATE_WINDOW_MS = 10_000;
const MESSAGE_RATE_LIMIT = 15;

export type MessageSender = { id: string; name: string | null; email: string | null };

export type CreateMessageInput = {
  content: string;
  replyToId?: string;
  /** Shared-content attachment (see Message.sharedType's schema comment). */
  sharedType?: string;
  sharedId?: string;
  /** Notification body override — used for a share, where the raw content
   * (often just an empty caption) wouldn't make a useful preview. Defaults
   * to a truncated echo of the message content. */
  notificationPreview?: (trimmedContent: string) => string;
};

/** Throws on any failure — same contract sendMessage always had, so
 * existing callers/tests didn't need to change when this was extracted. */
export async function createConversationMessage(
  sender: MessageSender,
  conversationId: string,
  input: CreateMessageInput,
): Promise<void> {
  const trimmed = input.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!trimmed && !input.sharedType) return;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: sender.id } },
    include: { conversation: { include: { participants: true } } },
  });
  if (!participant) throw new Error("대화에 참여하고 있지 않습니다.");

  const recentCount = await prisma.message.count({
    where: {
      senderId: sender.id,
      createdAt: { gte: new Date(Date.now() - MESSAGE_RATE_WINDOW_MS) },
    },
  });
  if (recentCount >= MESSAGE_RATE_LIMIT) {
    throw new Error("메시지를 너무 빠르게 보내고 있어요. 잠시 후 다시 시도해주세요.");
  }

  // A reply target must be a real message in THIS conversation — otherwise a
  // client could pass an arbitrary messageId from a conversation it isn't
  // even part of and have its snippet rendered here (an IDOR-shaped content
  // leak, not just a broken link).
  const validReplyToId = input.replyToId
    ? ((
        await prisma.message.findFirst({
          where: { id: input.replyToId, conversationId },
          select: { id: true },
        })
      )?.id ?? null)
    : null;

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: sender.id,
        content: trimmed,
        replyToId: validReplyToId,
        sharedType: input.sharedType ?? null,
        sharedId: input.sharedId ?? null,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  const actorName = sender.name ?? sender.email ?? "";
  const buildPreview =
    input.notificationPreview ??
    ((content: string) =>
      content.length > NOTIFICATION_PREVIEW_LENGTH
        ? `${content.slice(0, NOTIFICATION_PREVIEW_LENGTH)}…`
        : content);
  const preview = buildPreview(trimmed);
  const others = participant.conversation.participants.filter((p) => p.userId !== sender.id);
  await Promise.all(
    others.map((other) =>
      createNotification({
        userId: other.userId,
        type: "dm_message",
        title: `${actorName}님의 새 메시지`,
        body: preview,
        actorId: sender.id,
        targetUrl: `/social/${conversationId}`,
        metadata: { actorName, conversationId },
      }),
    ),
  );
}
