import type { Choice, Problem, Subject } from "@/generated/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type StudyBankParams } from "@/features/study-bank/search-params";

/**
 * 문제은행 data access. Reuses the existing per-user Problem model (no new table)
 * and the same Supabase + explicit `.eq("userId", …)` authorization policy as
 * features/problems/queries. New problems (from AI generation OR a future import
 * pipeline) show up automatically because the page reads live from the DB.
 */

export type BankProblem = Problem & { choices: Choice[]; subject: Subject | null };

export type StudyBankFacets = {
  subjects: Pick<Subject, "id" | "name" | "color">[];
  /** Distinct units per subjectId (for the cascading unit filter). */
  unitsBySubject: Record<string, string[]>;
  /** All distinct units (used when no subject is selected). */
  allUnits: string[];
};

/** Filter option data derived from the user's OWN problems/subjects. */
export async function getStudyBankFacets(userId: string): Promise<StudyBankFacets> {
  const supabase = await createClient();

  const [{ data: subjects }, { data: unitRows }] = await Promise.all([
    supabase
      .from("Subject")
      .select("id, name, color")
      .eq("userId", userId)
      .order("order", { ascending: true }),
    supabase
      .from("Problem")
      .select("subjectId, unit")
      .eq("userId", userId)
      .not("unit", "is", null),
  ]);

  const unitsBySubject: Record<string, Set<string>> = {};
  const allUnits = new Set<string>();
  for (const row of (unitRows ?? []) as { subjectId: string | null; unit: string | null }[]) {
    if (!row.unit) continue;
    allUnits.add(row.unit);
    const key = row.subjectId ?? "";
    (unitsBySubject[key] ??= new Set()).add(row.unit);
  }

  return {
    subjects: (subjects ?? []) as Pick<Subject, "id" | "name" | "color">[],
    unitsBySubject: Object.fromEntries(
      Object.entries(unitsBySubject).map(([k, v]) => [k, [...v].sort()]),
    ),
    allUnits: [...allUnits].sort(),
  };
}

/** Escape a search term for a PostgREST `.or(...ilike...)` filter. */
function sanitizeSearch(q: string): string {
  // Commas and parens are PostgREST filter syntax; strip them to avoid breaking
  // the .or() expression. `%`/`_` are treated literally enough for this UX.
  return q.replace(/[,()%]/g, " ").trim();
}

export type StudyBankResult = {
  items: BankProblem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Filtered + sorted + paginated problems for the current user. Always scoped to
 * `userId` server-side (never trust the client). `wrong`/`saved` tabs reuse the
 * existing WrongAnswer rows / isFavorite flag — no data duplication.
 */
export async function getStudyBankProblems(
  userId: string,
  params: StudyBankParams,
): Promise<StudyBankResult> {
  const supabase = await createClient();

  // "오답" tab: restrict to problems the user has a WrongAnswer for (reuse the
  // existing table). Resolve ids first, then filter — avoids a fragile join.
  let wrongProblemIds: string[] | null = null;
  if (params.tab === "wrong") {
    const { data } = await supabase
      .from("WrongAnswer")
      .select("problemId")
      .eq("userId", userId);
    wrongProblemIds = [...new Set((data ?? []).map((r) => r.problemId as string))];
    if (wrongProblemIds.length === 0) {
      return emptyResult(params.page);
    }
  }

  let query = supabase
    .from("Problem")
    .select("*, choices:Choice(*), subject:Subject(*)", { count: "exact" })
    .eq("userId", userId);

  if (params.tab === "saved") query = query.eq("isFavorite", true);
  if (wrongProblemIds) query = query.in("id", wrongProblemIds);

  if (params.subject) query = query.eq("subjectId", params.subject);
  if (params.unit) query = query.eq("unit", params.unit);
  if (params.difficulty) query = query.eq("difficulty", params.difficulty);
  if (params.type) query = query.eq("type", params.type);

  const search = sanitizeSearch(params.q);
  if (search) {
    query = query.or(`prompt.ilike.%${search}%,unit.ilike.%${search}%`);
  }

  // Sort. `recommended` shows most-recent (matches the existing "오늘 추천 문제"
  // behavior — no separate recommendation engine is introduced here).
  const difficultyAsc = params.sort === "difficulty_asc";
  const difficultyDesc = params.sort === "difficulty_desc";
  if (difficultyAsc || difficultyDesc) {
    // Postgres enum orders by declared order (EASY < MEDIUM < HARD).
    query = query
      .order("difficulty", { ascending: difficultyAsc })
      .order("createdAt", { ascending: false });
  } else {
    query = query.order("createdAt", { ascending: params.sort === "oldest" });
  }

  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const total = count ?? 0;
  return {
    items: (data ?? []) as BankProblem[],
    total,
    page: params.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

function emptyResult(page: number): StudyBankResult {
  return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 1 };
}
