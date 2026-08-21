import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFriendRankingForRange } from "@/features/ranking/queries";

/**
 * getFriendRankingForRange reuses the existing buildRanking()/getFriendUserIds()
 * machinery (private to this module) with an added StudySession.startedAt
 * lower bound. This asserts the wiring: friend scoping is preserved, a date
 * bound is actually applied, and "week" starts earlier than "today" — the
 * exact boundary math itself is covered by lib/date.test.ts.
 */
const { friendship, studySession } = vi.hoisted(() => ({
  friendship: { findMany: vi.fn() },
  studySession: { groupBy: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: { friendship, studySession } }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: () => ({
      select: () => ({
        in: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
}));

const VIEWER = "viewer-1";
const FRIEND = "friend-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFriendRankingForRange", () => {
  it("scopes StudySession.groupBy to viewer + friends and applies a startedAt lower bound", async () => {
    friendship.findMany.mockResolvedValue([{ requesterId: VIEWER, addresseeId: FRIEND }]);
    studySession.groupBy.mockResolvedValue([]);

    await getFriendRankingForRange(VIEWER, "today", "Asia/Seoul");

    const call = studySession.groupBy.mock.calls[0]![0];
    expect(call.where.userId).toEqual({ in: [VIEWER, FRIEND] });
    expect(call.where.startedAt.gte).toBeInstanceOf(Date);
  });

  it("uses an earlier startedAt bound for 'week' than for 'today'", async () => {
    friendship.findMany.mockResolvedValue([]);
    studySession.groupBy.mockResolvedValue([]);

    await getFriendRankingForRange(VIEWER, "today", "Asia/Seoul");
    const todayStart: Date = studySession.groupBy.mock.calls[0]![0].where.startedAt.gte;

    await getFriendRankingForRange(VIEWER, "week", "Asia/Seoul");
    const weekStart: Date = studySession.groupBy.mock.calls[1]![0].where.startedAt.gte;

    expect(weekStart.getTime()).toBeLessThan(todayStart.getTime());
  });
});
