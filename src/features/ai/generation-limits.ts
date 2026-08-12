/**
 * Central policy for how many questions a single AI generation may request.
 *
 * `AI_MAX_QUESTIONS` is the global hard ceiling enforced in the generation guard
 * (features/ai/generation-guard) for every surface — problem generation, mock
 * exams, 나만의 교재. Per-surface Zod schemas may set STRICTER caps (problems 10,
 * study-book 4 chapters × 5 = 20); those take precedence. This constant is the
 * defense-in-depth backstop so no path — including a direct/forged server-action
 * call that skips a form schema — can ever request an unbounded count.
 */
export const AI_MAX_QUESTIONS = 50;

export type CountCheck =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Validate a requested question count against [1, max]. Rejects, in order:
 * strings that aren't numbers, NaN/Infinity, non-integers (소수), ≤ 0 (0·음수),
 * and anything above the ceiling (51/100/…). Strings are coerced defensively
 * because a direct API caller can bypass the client and Zod entirely.
 */
export function checkQuestionCount(raw: unknown, max: number = AI_MAX_QUESTIONS): CountCheck {
  const n = typeof raw === "string" ? Number(raw.trim()) : raw;
  if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: "문항 수가 올바르지 않습니다." };
  }
  if (n < 1) return { ok: false, error: "문항은 1개 이상 생성할 수 있습니다." };
  if (n > max) return { ok: false, error: `문항은 최대 ${max}개까지 생성할 수 있습니다.` };
  return { ok: true, count: n };
}

/** Thrown by the generation guard when a request exceeds the central ceiling.
 * Recognized by generationErrorPayload → surfaces as a clear client message. */
export class InvalidCountError extends Error {
  readonly code = "invalid_count" as const;
  constructor(message: string) {
    super(message);
    this.name = "InvalidCountError";
  }
}

/** Throw InvalidCountError if `raw` is not a valid count in [1, max]. */
export function assertQuestionCount(raw: unknown, max: number = AI_MAX_QUESTIONS): number {
  const result = checkQuestionCount(raw, max);
  if (!result.ok) throw new InvalidCountError(result.error);
  return result.count;
}
