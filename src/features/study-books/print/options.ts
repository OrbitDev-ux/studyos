/**
 * Print/PDF options for a study book. Kept as plain data (no React) so both the
 * server page and the client toolbar share one source of truth.
 *
 * `include` is cumulative:
 *   problems      → 문제만 (개념/예제 본문 + 문제·보기, 정답/해설 없음)
 *   answers       → 문제 + 정답
 *   explanations  → 문제 + 정답 + 해설
 * Concept/example prose (교재 본문) always prints; the level only gates the
 * per-problem 정답/해설.
 */

export type IncludeLevel = "problems" | "answers" | "explanations";

export const INCLUDE_LEVELS: { id: IncludeLevel; label: string }[] = [
  { id: "problems", label: "문제만" },
  { id: "answers", label: "문제 + 정답" },
  { id: "explanations", label: "문제 + 정답 + 해설" },
];

export function parseIncludeLevel(value: string | undefined | null): IncludeLevel {
  return value === "problems" || value === "answers" ? value : "explanations";
}

export function showAnswers(level: IncludeLevel): boolean {
  return level !== "problems";
}

export function showExplanations(level: IncludeLevel): boolean {
  return level === "explanations";
}
