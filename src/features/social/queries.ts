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

/** Number of pending friend requests received — feeds the sidebar badge. */
export function getReceivedFriendRequestCount(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: { addresseeId: userId, status: "pending" },
  });
}

/** Unread DM count: messages from other people, in the user's conversations,
 * newer than when they last opened each thread. One query via OR conditions. */
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
    where: { senderId: { not: userId }, OR: conditions },
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

export function getReceivedFriendRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { addresseeId: userId, status: "pending" },
    include: { requester: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function getConversation(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId } } },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}
