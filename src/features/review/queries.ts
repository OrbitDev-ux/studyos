import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * `choices` deliberately excludes `isCorrect`: this feeds WrongAnswerActions
 * (a "use client" component) and is rendered before the retry is graded — the
 * correct choice is only learned from submitProblemAnswer's result after
 * submit, never from the initial page payload.
 */
export function getWrongAnswers(userId: string) {
  return prisma.wrongAnswer.findMany({
    where: { userId },
    include: {
      problem: {
        include: {
          choices: { select: { id: true, label: true, content: true } },
          subject: true,
        },
      },
    },
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

/** Request-scoped memoized: the dashboard reads this both directly and via the
 * daily-mission board in the same render. cache() collapses the duplicate count
 * to one query per request (still fresh across requests — no stale data). */
export const getDueReviewCount = cache((userId: string): Promise<number> => {
  return prisma.wrongAnswer.count({ where: dueReviewWhere(userId) });
});
