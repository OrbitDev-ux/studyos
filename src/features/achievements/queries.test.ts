import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test for a real bug: the correct-streak scan used
 * `orderBy: { createdAt: "asc" }` with a `take` limit, which fetches the
 * OLDEST N attempts instead of the most recent N. For a user with more
 * attempts than the scan limit, any streak in their recent activity could
 * never be found — bestCorrectStreak would only ever reflect ancient history.
 * Asserts the query orders by "desc" so this can't silently regress.
 */
vi.mock("server-only", () => ({}));

const { problemAttempt } = vi.hoisted(() => ({ problemAttempt: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    studySession: { count: vi.fn().mockResolvedValue(0) },
    problemAttempt: { ...problemAttempt, count: vi.fn().mockResolvedValue(0) },
    wrongAnswer: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/features/review/queries", () => ({
  getDueReviewCount: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/features/study-sessions/queries", () => ({
  getStreak: vi.fn().mockResolvedValue(0),
}));

import { getLearningStats } from "@/features/achievements/queries";

beforeEach(() => {
  vi.clearAllMocks();
  problemAttempt.findMany.mockResolvedValue([]);
});

describe("getLearningStats — correct-streak scan window", () => {
  it("scans the MOST RECENT attempts (desc), not the oldest", async () => {
    await getLearningStats("user-1", "Asia/Seoul");

    expect(problemAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("finds a streak that only exists in recent activity, beyond the scan limit's oldest attempts", async () => {
    // Simulates a heavy user: the query itself is mocked to already return
    // "desc" order (as it now does), with a 20-in-a-row streak at the very
    // start (i.e. most recent) of the returned window.
    const recentStreak = Array<boolean>(20).fill(true);
    const olderMixed = Array<boolean>(50)
      .fill(false)
      .map((_, i) => i % 2 === 1); // starts with false, so it never extends the streak above
    problemAttempt.findMany.mockResolvedValue(
      [...recentStreak, ...olderMixed].map((isCorrect) => ({ isCorrect })),
    );

    const stats = await getLearningStats("user-1", "Asia/Seoul");

    expect(stats.bestCorrectStreak).toBe(20);
  });
});
