import { prisma } from "@/lib/prisma";

export async function getFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: { requester: true, addressee: true },
    orderBy: { createdAt: "desc" },
  });

  return friendships.map((friendship) => ({
    friendshipId: friendship.id,
    user: friendship.requesterId === userId ? friendship.addressee : friendship.requester,
  }));
}

/** Accepted-friend user ids only (no name/email) — used by features that
 * need to scope a query to "my friends" without needing full friend rows
 * (e.g. the friend activity feed). */
export async function getFriendUserIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId,
  );
}

/** Number of pending friend requests received — feeds the sidebar badge. */
export function getReceivedFriendRequestCount(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: { addresseeId: userId, status: "pending" },
  });
}

/** Unread DM count: messages from other people, in the user's conversations,
 * newer than when they last opened each thread. One query via OR conditions.
 * Excludes soft-deleted messages — nothing left to read. */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  });
  if (parts.length === 0) return 0;

  const conditions = parts.map((p) => ({
    conversationId: p.conversationId,
    ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
  }));
  return prisma.message.count({
    where: { senderId: { not: userId }, deletedAt: null, OR: conditions },
  });
}

/** Combined social badge count = pending friend requests + unread messages. */
export async function getSocialNotificationCount(userId: string): Promise<number> {
  const [requests, unread] = await Promise.all([
    getReceivedFriendRequestCount(userId),
    getUnreadMessageCount(userId),
  ]);
  return requests + unread;
}

/** Mark a thread read for the user (clears its unread contribution). */
export function markConversationRead(conversationId: string, userId: string) {
  return prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });
}

/**
 * Unlike getFriends/getConversations (also `include: { user: true }`-shaped),
 * this result is passed as a prop directly into a "use client" component
 * (FriendRequestList) — those others stay server-side and re-select safe
 * fields before ever crossing a client boundary. A client component's props
 * are serialized to the browser in full regardless of which fields that
 * component's JSX actually reads, so `requester` MUST be pre-narrowed here at
 * the query itself (Security audit: an unscoped `include: { requester: true }`
 * previously shipped the requester's bcrypt password hash — and email,
 * banReason, etc. — to whoever received their friend request).
 */
export function getReceivedFriendRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { addresseeId: userId, status: "pending" },
    include: {
      requester: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Same field-narrowing rationale as getReceivedFriendRequests — this result
 * is passed to a "use client" settings component, so only safe fields are
 * selected here rather than the whole User row. */
export function getBlockedUsers(userId: string) {
  return prisma.blockedUser.findMany({
    where: { blockerId: userId },
    include: { blocked: { select: { id: true, name: true, image: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Same field-narrowing rationale as getReceivedFriendRequests, applied to
 * every participant.user select below (Security audit: getConversations/
 * getConversation previously used a bare `include: { user: true }`, pulling
 * the full User row — password hash included — into data these two queries'
 * callers go on to hand to client chat components). `lastSeenAt` is included
 * on purpose: it's how the conversation list/header derive the other
 * person's ONLINE/IDLE/OFFLINE dot (features/profile/presence.ts's
 * deriveOnlineStatus), reusing the existing presence system rather than
 * building a second one.
 */
const CONVERSATION_USER_SELECT = {
  id: true,
  name: true,
  image: true,
  email: true,
  lastSeenAt: true,
} as const;

/** Narrower still — this is only ever shown as "replying to {name}", never a
 * clickable profile entry point, so email/presence aren't needed. */
const REPLY_SENDER_SELECT = { id: true, name: true, image: true } as const;

export async function getConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: CONVERSATION_USER_SELECT } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Per-conversation unread count (bounded by how many conversations one user
  // has — same N+1-but-small-N tradeoff the rest of this file already makes,
  // e.g. getSocialNotificationCount). Each conversation has its own
  // lastReadAt cutoff, so this can't collapse into one groupBy.
  return Promise.all(
    conversations.map(async (conversation) => {
      const me = conversation.participants.find((p) => p.userId === userId);
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          deletedAt: null,
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
        },
      });
      return { ...conversation, unreadCount };
    }),
  );
}

export async function getConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: CONVERSATION_USER_SELECT } } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          replyTo: {
            select: {
              id: true,
              content: true,
              deletedAt: true,
              sender: { select: REPLY_SENDER_SELECT },
            },
          },
          reactions: { select: { id: true, emoji: true, userId: true } },
        },
      },
    },
  });
  if (!conversation) return null;

  // Redact soft-deleted content defense-in-depth (deleteMessage already
  // clears it in the DB at delete time — this keeps the redaction rule
  // enforced in exactly one place regardless of how a row got here).
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      content: message.deletedAt ? "" : message.content,
      replyTo:
        message.replyTo && message.replyTo.deletedAt
          ? { ...message.replyTo, content: "" }
          : message.replyTo,
    })),
  };
}

/**
 * Simple substring search over one conversation's own messages — scoped by
 * the same participant check every other conversation query uses, so a
 * conversationId that isn't the caller's returns an empty result rather than
 * throwing or leaking a count. Deliberately basic (ILIKE, no ranking/index):
 * a DM thread's message volume doesn't need full-text search infrastructure,
 * and this is written as its own query so a real index can be dropped in
 * later without changing the call site.
 */
export async function searchMessages(conversationId: string, userId: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!isParticipant) return [];

  return prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      content: { contains: trimmed, mode: "insensitive" },
    },
    select: { id: true, content: true, senderId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

