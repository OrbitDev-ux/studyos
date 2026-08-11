import type { Difficulty, QuestionType } from "@/generated/prisma/client";

/**
 * Types for the problem import pipeline. Shared by the REST route and (when one
 * exists) an MCP tool — both call the same service, so the contract lives here.
 */

/** Email of the system account that OWNS imported (shared 문제은행) problems.
 * Resolved/created on demand — never a hard-coded userId. */
export const IMPORT_USER_EMAIL = "problem-bank@import.studyos.local";
export const IMPORT_SOURCE = "import" as const;

/** Max problems accepted in a single request (oversized-payload protection). */
export const MAX_PROBLEMS_PER_REQUEST = 500;
export const MAX_PROMPT_LENGTH = 4000;
export const MAX_CHOICE_LENGTH = 1000;
export const MAX_EXPLANATION_LENGTH = 4000;

/** One incoming problem (external shape — taxonomy IDs + enum-ish strings). */
export type RawImportProblem = {
  gradeId?: unknown;
  subjectId?: unknown;
  unitId?: unknown;
  difficulty?: unknown;
  type?: unknown;
  prompt?: unknown;
  explanation?: unknown;
  choices?: unknown;
  answerText?: unknown;
  scoringCriteria?: unknown;
};

export type RawImportRequest = {
  batchId?: unknown;
  source?: unknown;
  targetNewProblems?: unknown;
  problems?: unknown;
};

/** A validated + canonicalized problem, ready to fingerprint and store. */
export type NormalizedProblem = {
  subjectName: string;
  unit: string | null;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  explanation: string;
  answerText: string | null;
  scoringCriteria: string | null;
  choices: { label: string; content: string; isCorrect: boolean }[] | null;
};

export type ImportItemStatus =
  | "accepted"
  | "duplicate_exact"
  | "rejected_validation";

export type ImportItemResult = {
  index: number;
  status: ImportItemStatus;
  /** Present when accepted. */
  problemId?: string;
  /** Present for duplicate_exact / rejected_validation (safe reason only). */
  reason?: string;
};

export type ImportResult = {
  batchId: string;
  source: string;
  received: number;
  accepted: number;
  duplicates: number;
  rejected: number;
  /** Present only when the request supplied targetNewProblems. */
  targetNewProblems?: number;
  remaining?: number;
  continueRecommended: boolean;
  results: ImportItemResult[];
};

/**
 * The persistence boundary the service depends on. The REST route provides a
 * Supabase/Prisma-backed implementation; tests provide an in-memory fake. This
 * keeps the service (validation/fingerprint/dedup/idempotency logic) pure and
 * unit-testable without a database.
 */
export interface ImportRepository {
  /** Which of these fingerprints already exist among imported problems. */
  findExistingFingerprints(fingerprints: string[]): Promise<Set<string>>;
  /** Insert one problem under the system import account; returns its id. Throws
   * a DUPLICATE marker if the fingerprint unique constraint fires (race backstop). */
  insertProblem(
    problem: NormalizedProblem,
    meta: { fingerprint: string; batchId: string },
  ): Promise<{ id: string } | { duplicate: true }>;
  /** Total imported problems now in the bank (for target/remaining math). */
  countImportedProblems(): Promise<number>;
}

/** Shape of the ProblemImportCompleted event (for a FUTURE Discord webhook /
 * event bus — NOT dispatched here). Derived purely from the import result. */
export type ProblemImportCompletedEvent = {
  type: "ProblemImportCompleted";
  batchId: string;
  source: string;
  received: number;
  accepted: number;
  duplicates: number;
  rejected: number;
  at: string;
};
