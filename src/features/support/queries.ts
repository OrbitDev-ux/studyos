import "server-only";
import { prisma } from "@/lib/prisma";

/** A user's tickets, newest activity first. adminNote is never selected. */
export function getUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * One ticket with its thread — ONLY if it belongs to `userId` (ownership is the
 * WHERE clause, so another user's ticketId simply returns null → 404). adminNote
 * is never selected; messages expose role + content only (no senderId/IP).
 */
export function getUserTicket(ticketId: string, userId: string) {
  return prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        select: { id: true, authorRole: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Tickets with an admin reply the user hasn't seen yet (admin message newer than
 * userLastReadAt). Powers the derived "새 답변" notification — no separate
 * read-state table, matching the existing notifications feed pattern.
 */
export async function getUnreadSupportReplies(
  userId: string,
): Promise<{ id: string; title: string }[]> {
  const tickets = await prisma.supportTicket.findMany({
    where: {
      userId,
      messages: { some: { authorRole: "admin" } },
    },
    select: {
      id: true,
      title: true,
      userLastReadAt: true,
      messages: {
        where: { authorRole: "admin" },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return tickets
    .filter((t) => {
      const lastAdmin = t.messages[0]?.createdAt;
      if (!lastAdmin) return false;
      return !t.userLastReadAt || lastAdmin > t.userLastReadAt;
    })
    .map((t) => ({ id: t.id, title: t.title }));
}
