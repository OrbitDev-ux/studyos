export const PROMPT_MIN_LENGTH = 20;
export const PROMPT_MAX_LENGTH = 20000;

export type PromptValidation = { ok: true } | { ok: false; error: string };

/** Guard run before any prompt save — empty / too short / too long / control
 * characters. Shared by the client editor (instant feedback) and the server
 * action (authoritative). */
export function validatePromptContent(content: string): PromptValidation {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "프롬프트가 비어 있습니다." };
  if (trimmed.length < PROMPT_MIN_LENGTH) {
    return {
      ok: false,
      error: `프롬프트가 너무 짧습니다 (최소 ${PROMPT_MIN_LENGTH}자).`,
    };
  }
  if (content.length > PROMPT_MAX_LENGTH) {
    return { ok: false, error: `프롬프트가 너무 깁니다 (최대 ${PROMPT_MAX_LENGTH}자).` };
  }
  // Reject control characters other than tab/newline/carriage-return.
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(content)) {
    return { ok: false, error: "허용되지 않는 제어 문자가 포함되어 있습니다." };
  }
  return { ok: true };
}
