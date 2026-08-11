import { computeFingerprint } from "@/features/problems/import/fingerprint";
import {
  MAX_PROBLEMS_PER_REQUEST,
  type ImportItemResult,
  type ImportRepository,
  type ImportResult,
  type NormalizedProblem,
  type ProblemImportCompletedEvent,
  type RawImportProblem,
  type RawImportRequest,
} from "@/features/problems/import/types";
import { validateImportProblem } from "@/features/problems/import/validation";

/** Thrown for a malformed request envelope (→ HTTP 400). Per-problem failures are
 * NOT thrown — they become `rejected_validation` items so a batch never fully
 * rolls back on one bad problem. */
export class ImportRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportRequestError";
  }
}

type ParsedEnvelope = {
  batchId: string;
  source: string;
  targetNewProblems: number | null;
  problems: RawImportProblem[];
};

function parseEnvelope(raw: RawImportRequest): ParsedEnvelope {
  const batchId = typeof raw.batchId === "string" ? raw.batchId.trim() : "";
  if (!batchId) throw new ImportRequestError("batchId is required");

  if (!Array.isArray(raw.problems)) {
    throw new ImportRequestError("problems must be an array");
  }
  if (raw.problems.length === 0) {
    throw new ImportRequestError("problems must not be empty");
  }
  if (raw.problems.length > MAX_PROBLEMS_PER_REQUEST) {
    throw new ImportRequestError(
      `too many problems (max ${MAX_PROBLEMS_PER_REQUEST} per request)`,
    );
  }

  let targetNewProblems: number | null = null;
  if (raw.targetNewProblems != null) {
    const n = Number(raw.targetNewProblems);
    if (Number.isFinite(n) && n > 0) targetNewProblems = Math.floor(n);
  }

  return {
    batchId,
    source: typeof raw.source === "string" && raw.source.trim() ? raw.source.trim() : "unknown",
    targetNewProblems,
    problems: raw.problems as RawImportProblem[],
  };
}

/**
 * THE import domain function — the single place REST and (future) MCP both call.
 * Validates each problem, de-duplicates by content fingerprint (within the batch
 * AND against already-imported problems), inserts only the new ones under the
 * system import account, and returns per-problem results so a partial batch is
 * preserved (no all-or-nothing rollback). Idempotent: re-sending the same batch
 * re-detects the fingerprints as duplicates and inserts nothing new.
 */
export async function importProblems(
  raw: RawImportRequest,
  repo: ImportRepository,
): Promise<ImportResult> {
  const env = parseEnvelope(raw);

  // 1) Validate + fingerprint every problem.
  const results: ImportItemResult[] = new Array(env.problems.length);
  const valid: { index: number; fingerprint: string; value: NormalizedProblem }[] = [];

  env.problems.forEach((rawProblem, index) => {
    const v = validateImportProblem(rawProblem);
    if (!v.ok) {
      results[index] = { index, status: "rejected_validation", reason: v.reason };
      return;
    }
    valid.push({ index, fingerprint: computeFingerprint(v.value), value: v.value });
  });

  // 2) Which fingerprints already exist in the bank.
  const existing = await repo.findExistingFingerprints(valid.map((c) => c.fingerprint));

  // 3) Insert new ones; dedupe within the batch too.
  const seenInBatch = new Set<string>();
  for (const cand of valid) {
    if (existing.has(cand.fingerprint) || seenInBatch.has(cand.fingerprint)) {
      results[cand.index] = {
        index: cand.index,
        status: "duplicate_exact",
        reason: "exact_match",
      };
      continue;
    }
    seenInBatch.add(cand.fingerprint);

    const inserted = await repo.insertProblem(cand.value, {
      fingerprint: cand.fingerprint,
      batchId: env.batchId,
    });
    if ("duplicate" in inserted) {
      // Lost a race to a concurrent/retried request — treat as duplicate.
      results[cand.index] = {
        index: cand.index,
        status: "duplicate_exact",
        reason: "exact_match",
      };
    } else {
      results[cand.index] = {
        index: cand.index,
        status: "accepted",
        problemId: inserted.id,
      };
    }
  }

  const accepted = results.filter((r) => r.status === "accepted").length;
  const duplicates = results.filter((r) => r.status === "duplicate_exact").length;
  const rejected = results.filter((r) => r.status === "rejected_validation").length;

  // 4) Target / remaining math (only when the caller supplied a goal).
  let remaining: number | undefined;
  let continueRecommended = false;
  if (env.targetNewProblems != null) {
    const totalImported = await repo.countImportedProblems();
    remaining = Math.max(0, env.targetNewProblems - totalImported);
    continueRecommended = remaining > 0;
  }

  return {
    batchId: env.batchId,
    source: env.source,
    received: env.problems.length,
    accepted,
    duplicates,
    rejected,
    ...(env.targetNewProblems != null
      ? { targetNewProblems: env.targetNewProblems, remaining }
      : {}),
    continueRecommended,
    results,
  };
}

/** Build the (not-yet-dispatched) ProblemImportCompleted event from a result.
 * A future Discord webhook / event bus consumes this — nothing is sent here. */
export function buildImportCompletedEvent(
  result: ImportResult,
): ProblemImportCompletedEvent {
  return {
    type: "ProblemImportCompleted",
    batchId: result.batchId,
    source: result.source,
    received: result.received,
    accepted: result.accepted,
    duplicates: result.duplicates,
    rejected: result.rejected,
    at: new Date().toISOString(),
  };
}
