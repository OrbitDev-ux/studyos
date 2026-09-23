import type { Difficulty, Prisma, Problem, QuestionType, Subject } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { IMPORT_SOURCE } from "@/features/problems/import/types";
import { PAGE_SIZE, type StudyBankParams } from "@/features/study-bank/search-params";

/**
 * 문제은행 data access. Reuses the existing per-user Problem model (no new table)
 * and Prisma with the same explicit `userId` scoping as features/problems/queries.
 * New problems (from AI generation OR a future import pipeline) show up
 * automatically because the page reads live from the DB. The former Supabase
 * anon-REST path was migrated here (trust-boundary cleanup) — these queries run
 * as the DB owner and every filter carries the userId server-side.
 */

// No `isCorrect` — this flows into StudyBankCard's SolveProblemPanel before
// the problem is solved (see problems/queries.ts's PublicChoice doc comment).
type PublicChoice = { id: string; problemId: string; label: string; content: string };
export type BankProblem = Problem & { choices: PublicChoice[]; subject: Subject | null };

export type StudyBankFacets = {
  /** Subject options for the filter — value is the subject NAME (works across the
   * user's own problems and shared imported ones, which use canonical names). */
  subjects: Pick<Subject, "id" | "name" | "color">[];
  /** All distinct units across the user's own + shared imported problems. */
  allUnits: string[];
};

/** Filter option data derived from the user's OWN problems/subjects. */
export async function getStudyBankFacets(userId: string): Promise<StudyBankFacets> {
  const [subjects, unitRows] = await Promise.all([
    prisma.subject.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
      orderBy: { order: "asc" },
    }),
    // Units across the user's OWN problems AND shared (imported) bank problems.
    prisma.problem.findMany({
      where: { OR: [{ userId }, { source: IMPORT_SOURCE }], unit: { not: null } },
      select: { unit: true },
    }),
  ]);

  const allUnits = new Set<string>();
  for (const row of unitRows) {
    if (row.unit) allUnits.add(row.unit);
  }

  return { subjects, allUnits: [...allUnits].sort() };
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
  // "오답" tab: restrict to problems the user has a WrongAnswer for (reuse the
  // existing table). Resolve ids first, then filter — avoids a fragile join.
  let wrongProblemIds: string[] | null = null;
  if (params.tab === "wrong") {
    const rows = await prisma.wrongAnswer.findMany({
      where: { userId },
      select: { problemId: true },
    });
    wrongProblemIds = [...new Set(rows.map((r) => r.problemId))];
    if (wrongProblemIds.length === 0) {
      return emptyResult(params.page);
    }
  }

  // Scope. "저장" is the user's OWN favorites (isFavorite is owner-specific). Every
  // other tab shows the user's own problems PLUS shared imported bank problems.
  const scope: Prisma.ProblemWhereInput = params.tab === "saved"
    ? { userId, isFavorite: true }
    : wrongProblemIds
      ? { id: { in: wrongProblemIds } }
      : { OR: [{ userId }, { source: IMPORT_SOURCE }] };

  // Subject filter is by NAME (resolve to the matching Subject ids). The scope
  // above already restricts rows to own/shared, so ids of other users named the
  // same are harmless (same semantics as the PostgREST version).
  if (params.subject) {
    const subs = await prisma.subject.findMany({
      where: { name: params.subject },
      select: { id: true },
    });
    const ids = subs.map((s) => s.id);
    if (ids.length === 0) return emptyResult(params.page);
    scope.subjectId = { in: ids };
  }
  if (params.unit) scope.unit = params.unit;
  if (params.difficulty) scope.difficulty = params.difficulty as Difficulty;
  if (params.type) scope.type = params.type as QuestionType;

  const search = sanitizeSearch(params.q);
  if (search) {
    scope.AND = [
      {
        OR: [
          { prompt: { contains: search, mode: "insensitive" } },
          { unit: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  // Sort. `recommended` shows most-recent (matches the existing "오늘 추천 문제"
  // behavior — no separate recommendation engine is introduced here).
  const difficultyAsc = params.sort === "difficulty_asc";
  const difficultyDesc = params.sort === "difficulty_desc";
  const orderBy: Prisma.ProblemOrderByWithRelationInput[] = [];
  if (difficultyAsc || difficultyDesc) {
    // Postgres enum orders by declared order (EASY < MEDIUM < HARD).
    orderBy.push(
      { difficulty: difficultyAsc ? "asc" : "desc" },
      { createdAt: "desc" },
    );
  } else {
    orderBy.push({ createdAt: params.sort === "oldest" ? "asc" : "desc" });
  }

  const skip = (params.page - 1) * PAGE_SIZE;
  const [items, total] = await Promise.all([
    prisma.problem.findMany({
      where: scope,
      include: {
        choices: { select: { id: true, problemId: true, label: true, content: true } },
        subject: true,
      },
      orderBy,
      skip,
      take: PAGE_SIZE,
    }),
    prisma.problem.count({ where: scope }),
  ]);

  return {
    items: items as BankProblem[],
    total,
    page: params.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

function emptyResult(page: number): StudyBankResult {
  return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 1 };
}
