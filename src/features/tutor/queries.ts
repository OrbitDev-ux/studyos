import "server-only";
import { prisma } from "@/lib/prisma";

/** A user's tutor conversations, most recent first. */
export function getTutorConversations(userId: string) {
  return prisma.tutorConversation.findMany({
    where: { userId },
    select: { id: true, subject: true, grade: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
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
