import { LOCALE_CONFIG, type Locale } from "@/features/i18n/config";

/**
 * Locale instruction appended to AI PROBLEM generation prompts (§16). Math stays
 * standard LaTeX regardless of language (§17). Korean is the default → no extra
 * instruction. Pure util (no server import) so it is unit-testable.
 */
export function problemLocaleInstruction(locale: Locale): string {
  if (locale === "ko-KR") return "";
  const lang = LOCALE_CONFIG[locale].english;
  return `Write all natural-language content (problem text, choices, answer, explanation) in ${lang}. Use standard LaTeX for any math regardless of language.`;
}

/** Locale instruction for the AI Tutor system prompt (§15). Applies the UI locale
 * by default; a per-message language request from the student may override it. */
export function tutorLocaleInstruction(locale: Locale): string {
  const cfg = LOCALE_CONFIG[locale];
  return `학생의 화면 언어는 ${cfg.label}(${cfg.english})입니다. 특별한 요청이 없으면 이 언어로 답하세요. 단, 학생이 이 대화에서 특정 언어로 답해달라고 명시하면 그 언어를 사용하세요. 수식은 언어와 무관하게 표준 LaTeX로 작성합니다.`;
}
