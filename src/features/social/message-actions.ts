"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { isQuickReaction } from "@/features/social/reactions";
import { searchMessages } from "@/features/social/queries";

const MAX_MESSAGE_LENGTH = 1000;

/**
 * Message-level Server Actions (edit/delete/react/typing) — split out from
 * social/actions.ts (friend requests, blocking, conversations) since this
 * file is entirely about permissions on an EXISTING message, all of which
 * follow the same shape: resolve the message, verify the caller against it
 * server-side, then act. Never trust a client-hidden button as the actual
 * permission check — every function below re-derives the permission from the
 * database on every call.
 */

export async function editMessage(messageId: string, content: string) {
  const user = await requireCurrentUser();
  const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!trimmed) return { error: "내용을 입력해주세요." };

  // Ownership (senderId) AND not-already-deleted are both in the WHERE
  // clause — updateMany (not update) so a messageId belonging to someone
  // else, or already soft-deleted, matches zero rows instead of throwing or
  // silently resurrecting a tombstone.
  const { count } = await prisma.message.updateMany({
    where: { id: messageId, senderId: user.id, deletedAt: null },
    data: { content: trimmed, editedAt: new Date() },
  });
  if (count === 0) return { error: "수정할 수 없는 메시지입니다." };

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (message) revalidatePath(`/social/${message.conversationId}`);
  return { success: true as const };
}

export async function deleteMessage(messageId: string) {
  const user = await requireCurrentUser();

  // Soft delete: content is cleared here (not just flagged) so the tombstone
  // is real at the DB level too, not only in what the UI chooses to render —
  // the row itself stays so any reply pointing at it doesn't dangle.
  const { count } = await prisma.message.updateMany({
    where: { id: messageId, senderId: user.id, deletedAt: null },
    data: { deletedAt: new Date(), content: "" },
  });
  if (count === 0) return;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (message) revalidatePath(`/social/${message.conversationId}`);
}

/**
 * Toggle a reaction: adding it if the caller hasn't reacted with this exact
 * emoji yet, removing it if they have. Requires the caller to be a
 * participant of the message's conversation — reacting isn't sender-only
 * (either side of a DM can react), but it's still conversation-scoped, not
 * "any message id, from anyone."
 */
export async function reactToMessage(messageId: string, emoji: string) {
  const user = await requireCurrentUser();
  if (!isQuickReaction(emoji)) return { error: "지원하지 않는 반응입니다." };

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      conversationId: true,
      conversation: { select: { participants: { select: { userId: true } } } },
    },
  });
  if (!message) return { error: "메시지를 찾을 수 없습니다." };
  const isParticipant = message.conversation.participants.some((p) => p.userId === user.id);
  if (!isParticipant) return { error: "메시지를 찾을 수 없습니다." };

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: user.id, emoji } },
    select: { id: true },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.create({ data: { messageId, userId: user.id, emoji } });
  }

  revalidatePath(`/social/${message.conversationId}`);
  return { success: true as const };
}

/**
 * Records "I am typing right now" for the polling conversation view to pick
 * up (see ConversationParticipant.typingAt's doc comment) — the client
 * throttles calls to at most once every few seconds, so this is nowhere near
 * a write-per-keystroke. No revalidatePath: the OTHER participant's own 4s
 * poll already re-fetches this via getConversation, and the caller's own
 * view doesn't need to re-render just because they typed.
 */
export async function setTyping(conversationId: string) {
  const user = await requireCurrentUser();
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: user.id },
    data: { typingAt: new Date() },
  });
}

/**
 * Thin Server Action wrapper so the client search box has something to call
 * — searchMessages itself already re-verifies participant membership, so
 * this isn't the only check, just the entry point client code can reach.
 */
export async function searchConversationMessages(conversationId: string, query: string) {
  const user = await requireCurrentUser();
  return searchMessages(conversationId, user.id, query);
}
