/**
 * URL-param model for /problems — same pattern as study-bank's search-params
 * (state lives in the URL so pagination/filters survive refresh and are
 * shareable), scaled down to what this simpler personal list actually needs:
 * a favorites toggle, a subject filter, and pagination. Pure (no IO), so it's
 * unit-testable on its own.
 */

export const PROBLEMS_TABS = ["all", "favorites"] as const;
export type ProblemsTab = (typeof PROBLEMS_TABS)[number];

export const PROBLEMS_PAGE_SIZE = 20;

export type ProblemsParams = {
  tab: ProblemsTab;
  /** Subject.id ("" = all subjects). */
  subjectId: string;
  /** 1-based page. */
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function parseProblemsParams(raw: RawParams): ProblemsParams {
  const rawTab = str(raw.tab);
  const pageNum = Number.parseInt(str(raw.page), 10);

  return {
    tab: (PROBLEMS_TABS as readonly string[]).includes(rawTab) ? (rawTab as ProblemsTab) : "all",
    subjectId: str(raw.subjectId),
    page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1,
  };
}

/**
 * Serialize params (with overrides) into a `/problems?...` querystring. Empty/
 * default values are omitted to keep URLs clean. Changing tab/subject resets
 * page to 1 unless page itself is overridden.
 */
export function buildProblemsHref(
  params: ProblemsParams,
  overrides: Partial<ProblemsParams> = {},
): string {
  const next: ProblemsParams = { ...params, ...overrides };
  const changedFilter = (["tab", "subjectId"] as const).some((k) => k in overrides);
  if (changedFilter && !("page" in overrides)) next.page = 1;

  const sp = new URLSearchParams();
  if (next.tab !== "all") sp.set("tab", next.tab);
  if (next.subjectId) sp.set("subjectId", next.subjectId);
  if (next.page > 1) sp.set("page", String(next.page));

  const qs = sp.toString();
  return qs ? `/problems?${qs}` : "/problems";
}
