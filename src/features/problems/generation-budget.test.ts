import { describe, expect, it } from "vitest";
import { generationBudgetFor } from "@/features/problems/generation-budget";

// The whole point of scaling the budget is to never exceed the page's
// maxDuration (60s) even in the worst case (all allowed attempts time out
// back-to-back, plus the provider's own backoff between them, capped at 8s).
const ROUTE_MAX_DURATION_MS = 60_000;
const MAX_BACKOFF_MS = 8_000;

function worstCaseMs(budget: { timeoutMs: number; retryAttempts: number }): number {
  const attempts = budget.retryAttempts + 1;
  return attempts * budget.timeoutMs + budget.retryAttempts * MAX_BACKOFF_MS;
}

describe("generationBudgetFor", () => {
  it.each([1, 2, 3])(
    "count=%i: allows one retry and still fits the route budget",
    (count) => {
      const budget = generationBudgetFor(count);
      expect(budget.retryAttempts).toBe(1);
      expect(worstCaseMs(budget)).toBeLessThan(ROUTE_MAX_DURATION_MS);
    },
  );

  it.each([4, 7, 10])(
    "count=%i: drops the retry (two attempts wouldn't fit) but a single attempt does",
    (count) => {
      const budget = generationBudgetFor(count);
      expect(budget.retryAttempts).toBe(0);
      expect(worstCaseMs(budget)).toBeLessThan(ROUTE_MAX_DURATION_MS);
    },
  );

  it("leaves headroom for the rest of the action (taxonomy/DB work), not just the AI call", () => {
    for (const count of [1, 5, 10]) {
      const margin = ROUTE_MAX_DURATION_MS - worstCaseMs(generationBudgetFor(count));
      expect(margin).toBeGreaterThan(5_000);
    }
  });
});
