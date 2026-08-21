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
 * `choices` excludes `isCorrect` — this flows into StudyBookViewer's
 * SolveProblemPanel before the item is solved (see its doc comment).
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
            include: {
              problem: {
                include: {
                  choices: { select: { id: true, label: true, content: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Correct-answer display text for MULTIPLE_CHOICE problems, keyed by
 * problemId — e.g. `{ "p1": "B. 15" }`. Used ONLY by the print page's answer
 * key (?include=answers|explanations), fetched separately from getStudyBook
 * so `isCorrect` never has to travel through the "문제만" print payload that
 * deliberately excludes answers.
 */
export async function getMultipleChoiceAnswerText(
  problemIds: string[],
): Promise<Map<string, string>> {
  if (problemIds.length === 0) return new Map();
  const correctChoices = await prisma.choice.findMany({
    where: { problemId: { in: problemIds }, isCorrect: true },
    select: { problemId: true, label: true, content: true },
  });
  const byProblem = new Map<string, string[]>();
  for (const c of correctChoices) {
    const list = byProblem.get(c.problemId) ?? [];
    list.push(`${c.label}. ${c.content}`);
    byProblem.set(c.problemId, list);
  }
  return new Map([...byProblem].map(([id, parts]) => [id, parts.join(",  ")]));
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
