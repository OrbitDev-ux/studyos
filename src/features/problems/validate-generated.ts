import type { QuestionType } from "@/generated/prisma/client";

type GeneratedAnswer = { answerText?: string };

/**
 * Drops any generated SHORT_ANSWER item missing its reference answerText.
 *
 * The AI generation schema (features/problems/schema.ts#aiProblemSchema)
 * can't structurally require "answerText present when type is SHORT_ANSWER"
 * — one JSON Schema serves all three question types (the prompt instructs
 * per-type, but nothing enforces it), and the model occasionally skips it
 * despite the instruction. A persisted SHORT_ANSWER problem with no
 * reference answer grades incorrectly for EVERY submission afterward (an
 * empty student answer normalizes to "" and matches an empty reference — see
 * grading.ts's own defensive guard for the same gap at grading time). Better
 * to drop it here — before it's ever persisted — than let a broken problem
 * into a student's problem set.
 *
 * MULTIPLE_CHOICE/ESSAY are untouched: MC grades from `choices[].isCorrect`,
 * and ESSAY grades from the student's own `selfCorrect`, so neither depends
 * on `answerText` for correctness (ESSAY's answerText is just the displayed
 * model answer — a blank one is a quality issue, not a grading bug).
 */
export function filterUngradableAnswers<T extends GeneratedAnswer>(
  generated: T[],
  type: QuestionType,
): { kept: T[]; droppedCount: number } {
  if (type !== "SHORT_ANSWER") return { kept: generated, droppedCount: 0 };

  const kept = generated.filter((problem) => Boolean(problem.answerText?.trim()));
  return { kept, droppedCount: generated.length - kept.length };
}
