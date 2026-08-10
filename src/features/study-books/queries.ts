import "server-only";
import { prisma } from "@/lib/prisma";

/** All of a user's books (owner-scoped), newest first, with chapter counts. */
export function getStudyBooks(userId: string) {
  return prisma.studyBook.findMany({
    where: { userId },
    include: { _count: { select: { chapters: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * One book with its chapters → items → (reused) problem + choices. Filtered by
 * userId so changing the URL's bookId can never reach another user's book.
 */
export function getStudyBook(bookId: string, userId: string) {
  return prisma.studyBook.findFirst({
    where: { id: bookId, userId },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: { problem: { include: { choices: true } } },
          },
        },
      },
    },
  });
}

export type StudyBookProgress = {
  totalProblems: number;
  completedProblems: number;
  learningRatePercent: number;
  accuracyPercent: number;
  reviewNeeded: number;
};

/**
 * Book learning progress computed from the SHARED Learning-OS data
 * (ProblemAttempt / WrongAnswer) — no duplicated per-book stats are stored.
 */
export async function getStudyBookProgress(
  bookId: string,
  userId: string,
): Promise<StudyBookProgress> {
  const items = await prisma.studyBookItem.findMany({
    where: { chapter: { bookId }, problemId: { not: null } },
    select: { problemId: true },
  });
  const problemIds = items
    .map((i) => i.problemId)
    .filter((id): id is string => !!id);
  const totalProblems = problemIds.length;
  if (totalProblems === 0) {
    return {
      totalProblems: 0,
      completedProblems: 0,
      learningRatePercent: 0,
      accuracyPercent: 0,
      reviewNeeded: 0,
    };
  }

  const [attempts, reviewNeeded] = await Promise.all([
    prisma.problemAttempt.findMany({
      where: { userId, problemId: { in: problemIds } },
      select: { problemId: true, isCorrect: true },
    }),
    prisma.wrongAnswer.count({
      where: { userId, resolved: false, problemId: { in: problemIds } },
    }),
  ]);

  const attempted = new Set<string>();
  const everCorrect = new Set<string>();
  for (const a of attempts) {
    attempted.add(a.problemId);
    if (a.isCorrect) everCorrect.add(a.problemId);
  }

  const completedProblems = attempted.size;
  return {
    totalProblems,
    completedProblems,
    learningRatePercent: Math.round((completedProblems / totalProblems) * 100),
    accuracyPercent:
      completedProblems === 0
        ? 0
        : Math.round((everCorrect.size / completedProblems) * 100),
    reviewNeeded,
  };
}
