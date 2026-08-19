import { normalizeText } from "@/features/problems/import/fingerprint";

type GeneratedProblem = { prompt: string };

/**
 * First-pass duplicate guard for freshly AI-generated problems: normalize
 * (Unicode NFKC, collapse whitespace, trim — same rule as the import
 * pipeline's fingerprinting, features/problems/import/fingerprint.ts) and
 * compare exact text against the user's own existing problems in the same
 * subject/unit. Deliberately NOT semantic/embedding-based — exact-after-
 * normalization is the appropriate first pass; a near-duplicate that reads
 * differently is not something this catches.
 *
 * `existingPrompts` should be scoped to the same user + subject + unit the
 * new problems were generated for; comparing across unrelated units would
 * both waste the check and risk false positives (a generic answer-choice
 * label matching by coincidence).
 */
export function filterDuplicateProblems<T extends GeneratedProblem>(
  generated: T[],
  existingPrompts: string[],
): { kept: T[]; duplicateCount: number } {
  const seen = new Set(existingPrompts.map(normalizeText));
  const kept: T[] = [];
  let duplicateCount = 0;

  for (const problem of generated) {
    const key = normalizeText(problem.prompt);
    if (seen.has(key)) {
      duplicateCount++;
      continue;
    }
    seen.add(key);
    kept.push(problem);
  }

  return { kept, duplicateCount };
}
