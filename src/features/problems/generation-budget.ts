/**
 * generateStructured()'s defaults (30s timeout, 2 retries) can add up to
 * ~90s+ worst case — past this feature's page (`maxDuration = 60`, see
 * app/(app)/problems/page.tsx), so Vercel kills the function mid-retry
 * instead of returning the classified error the guard exists to produce. A
 * larger batch also genuinely needs more single-attempt time than one
 * problem, so the budget scales with `count` rather than using one fixed
 * value:
 *   count 1-3  → 20s × up to 2 attempts ≈ 48s worst case (with backoff)
 *   count 4-10 → 45s × 1 attempt only — two attempts wouldn't fit the 60s
 *                budget anyway, and a doomed retry is worse than a clean
 *                single-attempt failure the client can immediately retry.
 * Keep this in sync with problems/page.tsx's `maxDuration` if that changes.
 */
export function generationBudgetFor(count: number): {
  timeoutMs: number;
  retryAttempts: number;
} {
  return count <= 3
    ? { timeoutMs: 20_000, retryAttempts: 1 }
    : { timeoutMs: 45_000, retryAttempts: 0 };
}
