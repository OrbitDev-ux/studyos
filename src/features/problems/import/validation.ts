import type { Difficulty, QuestionType } from "@/generated/prisma/client";
import { resolveTaxonomy } from "@/features/curriculum/taxonomy";
import {
  MAX_CHOICE_LENGTH,
  MAX_EXPLANATION_LENGTH,
  MAX_PROMPT_LENGTH,
  type NormalizedProblem,
  type RawImportProblem,
} from "@/features/problems/import/types";

/**
 * Validate + canonicalize ONE incoming problem, reusing the existing taxonomy
 * validation (resolveTaxonomy → canonical subject/unit names) and the same
 * Difficulty / QuestionType enums as the rest of the app. Never mutates meaning;
 * only maps external strings onto canonical values and rejects anything invalid.
 */

export type ValidationResult =
  | { ok: true; value: NormalizedProblem }
  | { ok: false; reason: string };

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
};

const TYPE_ALIASES: Record<string, QuestionType> = {
  multiple_choice: "MULTIPLE_CHOICE",
  mc: "MULTIPLE_CHOICE",
  short_answer: "SHORT_ANSWER",
  short: "SHORT_ANSWER",
  essay: "ESSAY",
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function mapEnum<T>(v: unknown, table: Record<string, T>): T | null {
  const key = asString(v).trim().toLowerCase();
  return table[key] ?? null;
}

/** MC choices may arrive as string[] (+ answerText = correct one) or as
 * {content,isCorrect}[]. Normalize both into labeled choices. */
function normalizeChoices(
  raw: unknown,
  answerText: string,
): { ok: true; choices: NormalizedProblem["choices"] } | { ok: false; reason: string } {
  if (!Array.isArray(raw) || raw.length < 2) {
    return { ok: false, reason: "mc_needs_at_least_2_choices" };
  }
  if (raw.length > 6) return { ok: false, reason: "mc_too_many_choices" };

  const isStringMode = raw.every((c) => typeof c === "string");
  const isObjectMode =
    !isStringMode &&
    raw.every(
      (c) => c && typeof c === "object" && typeof (c as { content?: unknown }).content === "string",
    );
  if (!isStringMode && !isObjectMode) {
    return { ok: false, reason: "invalid_choices" };
  }

  // Extract trimmed contents and validate STRUCTURE first (empty / length /
  // duplicate) — independent of which one is the answer.
  const contents = isStringMode
    ? (raw as string[]).map((c) => c.trim())
    : (raw as { content: string }[]).map((c) => c.content.trim());

  if (contents.some((c) => c.length === 0)) {
    return { ok: false, reason: "empty_choice" };
  }
  if (contents.some((c) => c.length > MAX_CHOICE_LENGTH)) {
    return { ok: false, reason: "choice_too_long" };
  }
  if (new Set(contents).size !== contents.length) {
    return { ok: false, reason: "duplicate_choices" };
  }

  // Determine correctness.
  let choices: { content: string; isCorrect: boolean }[];
  if (isStringMode) {
    const answer = answerText.trim();
    if (!answer) return { ok: false, reason: "mc_missing_answer" };
    choices = contents.map((content) => ({ content, isCorrect: content === answer }));
    if (!choices.some((c) => c.isCorrect)) {
      return { ok: false, reason: "answer_not_in_choices" };
    }
  } else {
    const flags = (raw as { isCorrect?: unknown }[]).map((c) => c.isCorrect === true);
    choices = contents.map((content, i) => ({ content, isCorrect: flags[i] === true }));
    if (choices.filter((c) => c.isCorrect).length !== 1) {
      return { ok: false, reason: "mc_needs_exactly_one_correct" };
    }
  }

  const labeled = choices.map((c, i) => ({
    label: String.fromCharCode(65 + i), // A, B, C, ...
    content: c.content,
    isCorrect: c.isCorrect,
  }));
  return { ok: true, choices: labeled };
}

export function validateImportProblem(raw: RawImportProblem): ValidationResult {
  const prompt = asString(raw.prompt).trim();
  if (!prompt) return { ok: false, reason: "missing_prompt" };
  if (prompt.length > MAX_PROMPT_LENGTH) return { ok: false, reason: "prompt_too_long" };

  const explanation = asString(raw.explanation).trim();
  if (!explanation) return { ok: false, reason: "missing_explanation" };
  if (explanation.length > MAX_EXPLANATION_LENGTH) {
    return { ok: false, reason: "explanation_too_long" };
  }

  const difficulty = mapEnum(raw.difficulty, DIFFICULTY_ALIASES);
  if (!difficulty) return { ok: false, reason: "invalid_difficulty" };

  const type = mapEnum(raw.type, TYPE_ALIASES);
  if (!type) return { ok: false, reason: "invalid_type" };

  // Reuse the authoritative taxonomy validation → canonical subject/unit names.
  const resolved = resolveTaxonomy({
    gradeId: asString(raw.gradeId),
    subjectId: asString(raw.subjectId),
    unitId: raw.unitId == null ? null : asString(raw.unitId),
  });
  if (!resolved.ok) return { ok: false, reason: "invalid_taxonomy" };

  const answerText = asString(raw.answerText).trim();
  const scoringCriteria = asString(raw.scoringCriteria).trim();

  let choices: NormalizedProblem["choices"] = null;

  if (type === "MULTIPLE_CHOICE") {
    const c = normalizeChoices(raw.choices, answerText);
    if (!c.ok) return { ok: false, reason: c.reason };
    choices = c.choices;
  } else if (type === "SHORT_ANSWER") {
    if (!answerText) return { ok: false, reason: "missing_answer_text" };
  } else {
    // ESSAY: answerText is the model answer (모범 답안) — required for self-grading.
    if (!answerText) return { ok: false, reason: "missing_model_answer" };
  }

  return {
    ok: true,
    value: {
      subjectName: resolved.value.subjectName,
      unit: resolved.value.unitName,
      difficulty,
      type,
      prompt,
      explanation,
      answerText: type === "MULTIPLE_CHOICE" ? null : answerText,
      scoringCriteria: type === "ESSAY" && scoringCriteria ? scoringCriteria : null,
      choices,
    },
  };
}
