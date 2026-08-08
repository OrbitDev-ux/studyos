import "server-only";
import type { Difficulty } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Where a graded attempt originated. */
export type AttemptSource = "practice" | "mock-exam" | "review";

/**
 * Append one graded attempt to the ProblemAttempt log — the per-attempt record
 * (correct AND wrong) that feeds weakness analysis, accuracy trends and solve
 * speed. Called from every submission path (practice, review retry, mock exam).
 * Subject/unit/difficulty are denormalized from the Problem at write time so
 * aggregation never has to join back.
 *
 * Accepts an optional Prisma transaction client so exam submission can log
 * inside its existing $transaction; defaults to the shared prisma client.
 */
export function recordProblemAttempt(
  input: {
    userId: string;
    problemId: string;
    subjectId: string | null;
    unit: string | null;
    difficulty: Difficulty;
    isCorrect: boolean;
    source: AttemptSource;
    /** The user's answer in readable form (chosen choice content / typed text). */
    answerText?: string | null;
    durationMs?: number | null;
  },
  client: Pick<typeof prisma, "problemAttempt"> = prisma,
) {
  return client.problemAttempt.create({
    data: {
      userId: input.userId,
      problemId: input.problemId,
      subjectId: input.subjectId,
      unit: input.unit,
      difficulty: input.difficulty,
      isCorrect: input.isCorrect,
      source: input.source,
      answerText: input.answerText ?? null,
      durationMs: input.durationMs ?? null,
    },
  });
}
