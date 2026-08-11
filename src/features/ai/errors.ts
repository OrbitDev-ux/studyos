import { z } from "zod";

/**
 * Pure AI-error classification — no SDK / server imports so it is unit-testable
 * and safe to import anywhere. `client.ts` re-exports these.
 *
 * The provider's raw error text is never surfaced: Gemini's 429 body contains
 * "check your plan and billing details", which must not reach the user or logs.
 */

export type AiErrorCode = "rate" | "unavailable" | "disabled" | "auth" | "failed";

/** A user-safe AI failure: a Korean message fit to show + a coarse `code`. */
export class AiGenerationError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiGenerationError";
    this.code = code;
  }
}

/**
 * Map a raw provider/SDK error to a safe AiGenerationError. 429 /
 * RESOURCE_EXHAUSTED (free-tier rate limit) is the common transient case.
 */
export function classifyAiError(err: unknown): AiGenerationError {
  if (err instanceof AiGenerationError) return err;
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : undefined;
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (
    status === 429 ||
    /RESOURCE_EXHAUSTED|quota|rate limit|too many requests/i.test(raw)
  ) {
    return new AiGenerationError("rate", "AI 사용량이 많아 잠시 후 다시 시도해주세요.");
  }
  if (
    status === 503 ||
    status === 500 ||
    /UNAVAILABLE|overloaded|internal error/i.test(raw)
  ) {
    return new AiGenerationError(
      "unavailable",
      "AI 서버가 혼잡해요. 잠시 후 다시 시도해주세요.",
    );
  }
  // Invalid / disabled API key or account (401/403, ACCOUNT_STATE_INVALID,
  // "API key not valid", expired key). This is a PERMANENT config failure, not a
  // transient one — surface it distinctly so it isn't hidden behind "잠시 후 다시
  // 시도" (which implies retrying will help). Raw provider text is never shown.
  if (
    status === 401 ||
    status === 403 ||
    /UNAUTHENTICATED|PERMISSION_DENIED|ACCOUNT_STATE_INVALID|API key not valid|API_KEY_INVALID|permission denied/i.test(
      raw,
    )
  ) {
    return new AiGenerationError(
      "auth",
      "AI 서비스 설정에 문제가 있어요. 관리자에게 문의해주세요.",
    );
  }
  return new AiGenerationError("failed", "AI 요청에 실패했어요. 잠시 후 다시 시도해주세요.");
}

/**
 * Convert a caught error into a client-safe payload for AI Server Actions that
 * RETURN errors instead of throwing (thrown Server Action errors are masked in
 * production, so an accurate message would never reach the user otherwise).
 * Returns null for non-AI errors (e.g. redirect control-flow) so the caller
 * rethrows them. A schema (Zod) parse failure is surfaced as a safe message.
 */
export function aiErrorResult(err: unknown): { error: string; code: AiErrorCode } | null {
  if (err instanceof AiGenerationError) return { error: err.message, code: err.code };
  if (err instanceof z.ZodError) {
    return {
      error: "AI 응답 형식이 올바르지 않아요. 잠시 후 다시 시도해주세요.",
      code: "failed",
    };
  }
  return null;
}
