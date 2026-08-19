import type { QuestionType } from "@/generated/prisma/client";
import { normalizeAnswer } from "@/features/problems/utils";

/** The minimal problem shape grading needs — decoupled from any DB/API row
 * shape so this stays a pure function, independently testable, and reusable
 * anywhere a problem gets graded (currently just submitProblemAnswer). */
export type GradableProblem = {
  type: QuestionType;
  choices: { id: string; content: string; isCorrect: boolean }[];
  /** Canonical answer for SHORT_ANSWER; the model answer for ESSAY (unused
   * for grading there — ESSAY grades from `selfCorrect` instead). */
  answerText: string | null;
};

export type SubmittedAnswer = {
  choiceId?: string;
  text?: string;
  /** ESSAY only: the student's own self-assessment against the model answer. */
  selfCorrect?: boolean;
};

export type GradeResult = {
  correct: boolean;
  /** The user's answer in human-readable form, for the attempt log / DNA. */
  userAnswerText: string | null;
};

/**
 * Server-authoritative grading — this is the ONLY place "correct" gets
 * decided, and it never trusts anything the client claims about correctness
 * (a MULTIPLE_CHOICE grade comes from the DB's `choices[].isCorrect`, never
 * from a client-sent flag). A choiceId that doesn't match any of THIS
 * problem's choices — because nothing was selected, the id is garbage, or
 * it's actually another problem's choice id — simply finds no match and
 * grades as incorrect; it can never throw or grade a foreign choice correct.
 */
export function gradeAnswer(problem: GradableProblem, answer: SubmittedAnswer): GradeResult {
  const selectedChoice =
    problem.type === "MULTIPLE_CHOICE"
      ? problem.choices.find((choice) => choice.id === answer.choiceId)
      : undefined;

  const correct =
    problem.type === "MULTIPLE_CHOICE"
      ? (selectedChoice?.isCorrect ?? false)
      : problem.type === "ESSAY"
        ? (answer.selfCorrect ?? false)
        : normalizeAnswer(answer.text ?? "") === normalizeAnswer(problem.answerText ?? "");

  const userAnswerText =
    problem.type === "MULTIPLE_CHOICE"
      ? (selectedChoice?.content ?? null)
      : (answer.text?.trim() || null);

  return { correct, userAnswerText };
}
