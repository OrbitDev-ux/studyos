import type { Difficulty, QuestionType } from "@/generated/prisma/client";

/**
 * URL-param model for the 문제은행 (/study-bank). State lives entirely in the URL
 * (matching the project's server-component + searchParams pattern — no client
 * data-fetching lib), so filters/pagination survive refresh and are shareable.
 * This module is pure (no IO) → unit-testable.
 */

export const STUDY_BANK_TABS = ["all", "recommended", "wrong", "saved"] as const;
export type StudyBankTab = (typeof STUDY_BANK_TABS)[number];

export const STUDY_BANK_SORTS = [
  "recent",
  "oldest",
  "difficulty_asc",
  "difficulty_desc",
] as const;
export type StudyBankSort = (typeof STUDY_BANK_SORTS)[number];

export const SORT_LABEL: Record<StudyBankSort, string> = {
  recent: "최신순",
  oldest: "오래된순",
  difficulty_asc: "난이도 낮은순",
  difficulty_desc: "난이도 높은순",
};

export const TAB_LABEL: Record<StudyBankTab, string> = {
  all: "전체",
  recommended: "추천",
  wrong: "오답",
  saved: "저장",
};

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const TYPES: QuestionType[] = ["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"];

export const PAGE_SIZE = 12;

export type StudyBankParams = {
  tab: StudyBankTab;
  q: string;
  /** Subject.id ("" = all subjects). */
  subject: string;
  /** Problem.unit exact value ("" = all units). */
  unit: string;
  /** Difficulty enum or "" (all). */
  difficulty: Difficulty | "";
  /** QuestionType enum or "" (all). */
  type: QuestionType | "";
  sort: StudyBankSort;
  /** 1-based page. */
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseStudyBankParams(raw: RawParams): StudyBankParams {
  const rawDifficulty = str(raw.difficulty);
  const rawType = str(raw.type);
  const pageNum = Number.parseInt(str(raw.page), 10);

  return {
    tab: oneOf(str(raw.tab), STUDY_BANK_TABS, "all"),
    q: str(raw.q).slice(0, 100),
    subject: str(raw.subject),
    unit: str(raw.unit),
    difficulty: (DIFFICULTIES as string[]).includes(rawDifficulty)
      ? (rawDifficulty as Difficulty)
      : "",
    type: (TYPES as string[]).includes(rawType) ? (rawType as QuestionType) : "",
    sort: oneOf(str(raw.sort), STUDY_BANK_SORTS, "recent"),
    page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1,
  };
}

/** True when any narrowing filter (not tab/sort/page) is active. */
export function hasActiveFilters(p: StudyBankParams): boolean {
  return !!(p.q || p.subject || p.unit || p.difficulty || p.type);
}

/**
 * Serialize params (with overrides) into a `/study-bank?...` querystring.
 * Empty/default values are omitted to keep URLs clean. Any override that changes
 * a filter resets `page` to 1 unless `page` itself is overridden.
 */
export function buildStudyBankHref(
  params: StudyBankParams,
  overrides: Partial<StudyBankParams> = {},
): string {
  const next: StudyBankParams = { ...params, ...overrides };
  // Changing anything other than page/tab/sort resets pagination.
  const changedFilter = (
    ["q", "subject", "unit", "difficulty", "type"] as const
  ).some((k) => k in overrides);
  if (changedFilter && !("page" in overrides)) next.page = 1;

  const sp = new URLSearchParams();
  if (next.tab !== "all") sp.set("tab", next.tab);
  if (next.q) sp.set("q", next.q);
  if (next.subject) sp.set("subject", next.subject);
  if (next.unit) sp.set("unit", next.unit);
  if (next.difficulty) sp.set("difficulty", next.difficulty);
  if (next.type) sp.set("type", next.type);
  if (next.sort !== "recent") sp.set("sort", next.sort);
  if (next.page > 1) sp.set("page", String(next.page));

  const qs = sp.toString();
  return qs ? `/study-bank?${qs}` : "/study-bank";
}
