import type { Difficulty } from "@/generated/prisma/client";

/**
 * Pure presentation helpers for the exam paper. No DB/React — testable in
 * isolation. These only affect how existing exam data is DISPLAYED on the
 * printable paper; grading/generation/answers are untouched.
 */

/** Circled number ①②③… for a 0-based choice index (Korean exam convention). */
export function circledNumber(index: number): string {
  // U+2460 (①) … U+2473 (⑳). Fall back to "(n)" beyond the circled range.
  if (index >= 0 && index < 20) return String.fromCharCode(0x2460 + index);
  return `(${index + 1})`;
}

/**
 * Per-question 배점 shown on the paper. The schema has no points column, so we
 * derive a conventional value from difficulty — a display-only convention that
 * does not change scoring (grading stays "correct/total" as before).
 */
export function pointsForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case "EASY":
      return 2;
    case "HARD":
      return 4;
    case "MEDIUM":
    default:
      return 3;
  }
}

/**
 * Whether a problem should span both columns (full width) instead of flowing in
 * the 2-column layout — long prompts or ones with several lines read better full
 * width and avoid awkward column splits.
 */
export function isLongPrompt(prompt: string): boolean {
  const lines = prompt.split("\n").length;
  return prompt.length > 180 || lines >= 4;
}

/** Zero-padded question number for the answer sheet ("01", "02", …). */
export function padQuestionNumber(n: number): string {
  return String(n).padStart(2, "0");
}
