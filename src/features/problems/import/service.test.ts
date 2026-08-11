import { describe, expect, it } from "vitest";
import {
  ImportRequestError,
  buildImportCompletedEvent,
  importProblems,
} from "@/features/problems/import/service";
import type { ImportRepository, RawImportProblem } from "@/features/problems/import/types";

/** In-memory ImportRepository — lets the service's validate/dedupe/idempotency
 * logic be tested without a database. */
function fakeRepo(seed: string[] = []) {
  const store = new Set(seed);
  let counter = 0;
  const repo: ImportRepository = {
    async findExistingFingerprints(fps) {
      return new Set(fps.filter((f) => store.has(f)));
    },
    async insertProblem(_p, meta) {
      if (store.has(meta.fingerprint)) return { duplicate: true };
      store.add(meta.fingerprint);
      return { id: `p${++counter}` };
    },
    async countImportedProblems() {
      return store.size;
    },
  };
  return { repo, store };
}

const TAXO = { gradeId: "elem-5", subjectId: "math", unitId: "fraction-mult" };
const mc = (prompt: string, over: Partial<RawImportProblem> = {}): RawImportProblem => ({
  ...TAXO,
  difficulty: "medium",
  type: "multiple_choice",
  prompt,
  explanation: "설명",
  choices: ["3/10", "2/5", "5/8", "6/20"],
  answerText: "3/10",
  ...over,
});

const req = (problems: RawImportProblem[], extra = {}) => ({
  batchId: "batch-1",
  source: "claude-code",
  problems,
  ...extra,
});

describe("importProblems", () => {
  it("accepts a single new problem", async () => {
    const { repo } = fakeRepo();
    const r = await importProblems(req([mc("문제 A")]), repo);
    expect(r.received).toBe(1);
    expect(r.accepted).toBe(1);
    expect(r.results[0]!.status).toBe("accepted");
    expect(r.results[0]!.problemId).toBeTruthy();
  });

  it("dedupes identical problems WITHIN a batch (whitespace-insensitive)", async () => {
    const { repo } = fakeRepo();
    const r = await importProblems(req([mc("문제 A"), mc("문제  A\n")]), repo);
    expect(r.accepted).toBe(1);
    expect(r.duplicates).toBe(1);
    expect(r.results.map((x) => x.status)).toEqual(["accepted", "duplicate_exact"]);
  });

  it("dedupes against already-imported problems (idempotent re-send)", async () => {
    const { repo } = fakeRepo();
    const first = await importProblems(req([mc("문제 A"), mc("문제 B")]), repo);
    expect(first.accepted).toBe(2);
    // Re-send the same batch → nothing new.
    const second = await importProblems(req([mc("문제 A"), mc("문제 B")]), repo);
    expect(second.accepted).toBe(0);
    expect(second.duplicates).toBe(2);
  });

  it("keeps per-problem results for a mixed batch (no all-or-nothing)", async () => {
    const { repo } = fakeRepo();
    const r = await importProblems(
      req([
        mc("문제 A"), // accepted
        mc("문제 A"), // duplicate (within batch)
        mc("문제 C", { difficulty: "nope" }), // rejected
        mc("문제 D"), // accepted
      ]),
      repo,
    );
    expect(r.received).toBe(4);
    expect(r.accepted).toBe(2);
    expect(r.duplicates).toBe(1);
    expect(r.rejected).toBe(1);
    expect(r.results.map((x) => x.status)).toEqual([
      "accepted",
      "duplicate_exact",
      "rejected_validation",
      "accepted",
    ]);
  });

  it("handles a 100-problem batch of unique problems", async () => {
    const { repo } = fakeRepo();
    const problems = Array.from({ length: 100 }, (_, i) => mc(`문제 ${i}`));
    const r = await importProblems(req(problems), repo);
    expect(r.received).toBe(100);
    expect(r.accepted).toBe(100);
  });

  it("computes remaining / continueRecommended from targetNewProblems", async () => {
    const { repo } = fakeRepo();
    const r = await importProblems(
      req([mc("문제 A"), mc("문제 B")], { targetNewProblems: 5 }),
      repo,
    );
    expect(r.targetNewProblems).toBe(5);
    expect(r.remaining).toBe(3); // 5 - 2 imported
    expect(r.continueRecommended).toBe(true);
  });

  it("stops recommending once the target is met", async () => {
    const { repo } = fakeRepo();
    const r = await importProblems(
      req([mc("문제 A"), mc("문제 B")], { targetNewProblems: 2 }),
      repo,
    );
    expect(r.remaining).toBe(0);
    expect(r.continueRecommended).toBe(false);
  });

  it("throws ImportRequestError for a malformed envelope", async () => {
    const { repo } = fakeRepo();
    await expect(importProblems({ problems: [mc("A")] }, repo)).rejects.toThrow(
      ImportRequestError,
    );
    await expect(
      importProblems({ batchId: "b", problems: [] }, repo),
    ).rejects.toThrow(ImportRequestError);
  });
});

describe("buildImportCompletedEvent", () => {
  it("derives the (undispatched) event from a result", async () => {
    const { repo } = fakeRepo();
    const result = await importProblems(req([mc("문제 A")]), repo);
    const event = buildImportCompletedEvent(result);
    expect(event.type).toBe("ProblemImportCompleted");
    expect(event.batchId).toBe("batch-1");
    expect(event.accepted).toBe(1);
    expect(typeof event.at).toBe("string");
  });
});
