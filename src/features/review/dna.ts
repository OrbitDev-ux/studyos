import { z } from "zod";

/**
 * 오답 DNA (Phase 4) — the fixed taxonomy of *why* an answer was wrong. Kept as
 * a pure module (no DB/AI imports) so it can be unit-tested and shared between
 * the AI schema, the server action, and the UI.
 */
export const ERROR_TYPES = [
  "CALCULATION_ERROR",
  "CONCEPT_ERROR",
  "READING_ERROR",
  "FORMULA_ERROR",
  "CARELESS_ERROR",
  "UNKNOWN",
] as const;

export type ErrorType = (typeof ERROR_TYPES)[number];

export const ERROR_TYPE_LABEL: Record<ErrorType, string> = {
  CALCULATION_ERROR: "계산 실수",
  CONCEPT_ERROR: "개념 오류",
  READING_ERROR: "문제 이해 오류",
  FORMULA_ERROR: "공식 오류",
  CARELESS_ERROR: "단순 실수",
  UNKNOWN: "원인 불명",
};

/** Shape the AI must return for a wrong-answer DNA analysis. Validated
 * server-side; an out-of-taxonomy `type` is rejected rather than shown. */
export const wrongAnswerDnaSchema = z.object({
  type: z.enum(ERROR_TYPES),
  concept: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(1).max(500),
});

export type WrongAnswerDna = z.infer<typeof wrongAnswerDnaSchema>;

/** Narrow an arbitrary stored string back to a known ErrorType (for the UI). */
export function toErrorType(value: string | null | undefined): ErrorType {
  return value && (ERROR_TYPES as readonly string[]).includes(value)
    ? (value as ErrorType)
    : "UNKNOWN";
}
