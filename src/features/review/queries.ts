import { prisma } from "@/lib/prisma";

export function getWrongAnswers(userId: string) {
  return prisma.wrongAnswer.findMany({
    where: { userId },
    include: { problem: { include: { choices: true, subject: true } } },
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
  });
}

/** Spaced-repetition "due now" filter: unresolved wrong answers whose
 * nextReviewAt has passed (or was never set). Soonest-due first. */
function dueReviewWhere(userId: string) {
  return {
    userId,
    resolved: false,
    OR: [{ nextReviewAt: { lte: new Date() } }, { nextReviewAt: null }],
  };
}

/** Wrong answers due for review right now (Phase 5) — feeds the "오늘 복습" card. */
export function getDueReviews(userId: string, limit: number) {
  return prisma.wrongAnswer.findMany({
    where: dueReviewWhere(userId),
    include: { problem: { include: { subject: true } } },
    orderBy: { nextReviewAt: "asc" },
    take: limit,
  });
}

export function getDueReviewCount(userId: string): Promise<number> {
  return prisma.wrongAnswer.count({ where: dueReviewWhere(userId) });
}
