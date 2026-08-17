/**
 * URL-param model for /study-materials, matching the project's server-component
 * + searchParams pattern (see features/study-bank/search-params.ts) — state
 * lives in the URL so folder navigation and search survive refresh and are
 * shareable. Pure (no IO) → unit-testable.
 */

export type StudyMaterialsParams = {
  /** MaterialFolder.id of the folder currently being browsed; "" = root. */
  folder: string;
  /** Search query; "" = not searching (browse mode). */
  q: string;
};

type RawParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function parseStudyMaterialsParams(raw: RawParams): StudyMaterialsParams {
  return {
    folder: str(raw.folder),
    q: str(raw.q).slice(0, 100),
  };
}

export function buildStudyMaterialsHref(
  overrides: Partial<StudyMaterialsParams>,
): string {
  const sp = new URLSearchParams();
  if (overrides.folder) sp.set("folder", overrides.folder);
  if (overrides.q) sp.set("q", overrides.q);
  const qs = sp.toString();
  return qs ? `/study-materials?${qs}` : "/study-materials";
}
