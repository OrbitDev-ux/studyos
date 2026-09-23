import type { Prisma, Problem, Subject } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PROBLEMS_PAGE_SIZE, type ProblemsParams } from "@/features/problems/search-params";

// The Supabase client has no generated DB types wired in, so every .from()
// call is loosely typed on its own — these annotate the query functions'
// return shapes by hand (matching exactly what Prisma used to return) so
// consumers keep the same compile-time safety they had before.
//
// `PublicChoice` deliberately omits `isCorrect`: this row flows straight into
// a "use client" component (ProblemCard → SolveProblemPanel) before the
// student has answered, and a client component's props are serialized to the
// browser in full — the same class of leak social/queries.ts's
// getReceivedFriendRequests doc comment warns about, just for answer keys
// instead of credentials.
type PublicChoice = { id: string; problemId: string; label: string; content: string };
export type ProblemWithRelations = Problem & { choices: PublicChoice[]; subject: Subject | null };
type ProblemWithSubject = Problem & { subject: Subject | null };

export type PaginatedProblems = {
  items: ProblemWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function emptyResult(page: number): PaginatedProblems {
  return { items: [], total: 0, page, pageSize: PROBLEMS_PAGE_SIZE, totalPages: 1 };
}

/**
 * Filtered + paginated personal problem list for /problems. Was previously
 * unbounded (fetched every AI-generated problem the user ever made in one
 * query) — degrades visibly for any active user after a few months, the same
 * scale issue study-bank's own facet+pagination system already solved for
 * the shared bank.
 */
export async function getProblems(
  userId: string,
  params: ProblemsParams,
): Promise<PaginatedProblems> {
  const where: Prisma.ProblemWhereInput = { userId };
  if (params.tab === "favorites") where.isFavorite = true;
  if (params.subjectId) where.subjectId = params.subjectId;

  const skip = (params.page - 1) * PROBLEMS_PAGE_SIZE;
  const [items, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      include: {
        subject: true,
        choices: { select: { id: true, problemId: true, label: true, content: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PROBLEMS_PAGE_SIZE,
    }),
    prisma.problem.count({ where }),
  ]);

  if (total === 0) return emptyResult(params.page);
  return {
    items: items as ProblemWithRelations[],
    total,
    page: params.page,
    pageSize: PROBLEMS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PROBLEMS_PAGE_SIZE)),
  };
}

/** Small "recently added" slice for the dashboard card — not a real recommendation engine. */
export async function getRecentProblems(
  userId: string,
  limit: number,
): Promise<ProblemWithSubject[]> {
  return prisma.problem.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  }) as unknown as ProblemWithSubject[];
}
