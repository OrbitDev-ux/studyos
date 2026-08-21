import "server-only";
import { prisma } from "@/lib/prisma";

/** Sidebar cap — was previously unbounded (every conversation a user ever
 * had, forever), which would eventually mean the whole chat history loads on
 * every /tutor page view. Most recent 50 covers realistic sidebar use; the
 * conversation itself (and its full message history) is still reachable
 * directly by id regardless of this cap. */
const RECENT_CONVERSATIONS_LIMIT = 50;

/** A user's tutor conversations, most recent first. */
export function getTutorConversations(userId: string) {
  return prisma.tutorConversation.findMany({
    where: { userId },
    select: { id: true, subject: true, grade: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: RECENT_CONVERSATIONS_LIMIT,
  });
}

/**
 * One conversation with its messages — ONLY if it belongs to `userId` (ownership
 * is the WHERE clause → another user's id returns null → 404).
 */
export function getTutorConversation(id: string, userId: string) {
  return prisma.tutorConversation.findFirst({
    where: { id, userId },
    select: {
      id: true,
      subject: true,
      grade: true,
      title: true,
      messages: {
        select: { id: true, role: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
