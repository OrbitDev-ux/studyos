import { describe, expect, it, vi } from "vitest";
import { getFriendActivityFeed } from "@/features/social/activity";

/**
 * Mirrors the security-regression style of social/queries.test.ts: this
 * feed's rows are read by a Server Action and eventually rendered client-
 * side, so the StudySession/Goal `select` must never widen to a bare
 * `include: { user: true }` (which would ship password/email/etc.), and the
 * friend scoping + activitySharingEnabled opt-out must always be present in
 * the `where` clause — not applied after the fact in JS.
 */
const { friendship, studySession, goal } = vi.hoisted(() => ({
  friendship: { findMany: vi.fn() },
  studySession: { findMany: vi.fn() },
  goal: { findMany: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { friendship, studySession, goal } }));

const VIEWER = "viewer-1";
const FRIEND_A = "friend-a";
const FRIEND_B = "friend-b";

function mockFriendsOf(...friendIds: string[]) {
  friendship.findMany.mockResolvedValue(
    friendIds.map((id) => ({ requesterId: VIEWER, addresseeId: id })),
  );
}

describe("getFriendActivityFeed", () => {
  it("returns [] without querying sessions/goals when the viewer has no friends", async () => {
    mockFriendsOf();
    const result = await getFriendActivityFeed(VIEWER, "Asia/Seoul");
    expect(result).toEqual([]);
    expect(studySession.findMany).not.toHaveBeenCalled();
    expect(goal.findMany).not.toHaveBeenCalled();
  });

  it("scopes both queries to friend ids + activitySharingEnabled, with a safe select", async () => {
    mockFriendsOf(FRIEND_A, FRIEND_B);
    studySession.findMany.mockResolvedValue([]);
    goal.findMany.mockResolvedValue([]);

    await getFriendActivityFeed(VIEWER, "Asia/Seoul");

    const sessionCall = studySession.findMany.mock.calls[0]![0];
    expect(sessionCall.where.userId).toEqual({ in: [FRIEND_A, FRIEND_B] });
    expect(sessionCall.where.user).toEqual({ activitySharingEnabled: true });
    expect(sessionCall.select.user).not.toBe(true);
    expect(sessionCall.select.user.select).toEqual({ name: true, image: true });
    expect(sessionCall.select.user.select.email).toBeUndefined();
    expect(sessionCall.select.user.select.password).toBeUndefined();

    const goalCall = goal.findMany.mock.calls[0]![0];
    expect(goalCall.where.userId).toEqual({ in: [FRIEND_A, FRIEND_B] });
    expect(goalCall.where.user).toEqual({ activitySharingEnabled: true });
    expect(goalCall.select.user).not.toBe(true);
    expect(goalCall.select.user.select).toEqual({ name: true, image: true });
  });

  it("only includes goals that reached their target, and merges+sorts with sessions newest-first", async () => {
    mockFriendsOf(FRIEND_A);
    studySession.findMany.mockResolvedValue([
      {
        id: "s1",
        userId: FRIEND_A,
        durationSec: 1800,
        startedAt: new Date("2026-08-19T10:00:00Z"),
        subject: { name: "수학" },
        user: { name: "A", image: null },
      },
    ]);
    goal.findMany.mockResolvedValue([
      {
        id: "g1",
        userId: FRIEND_A,
        title: "완료된 목표",
        currentValue: 10,
        targetValue: 10,
        updatedAt: new Date("2026-08-20T01:00:00Z"), // newer than the session
        user: { name: "A", image: null },
      },
      {
        id: "g2",
        userId: FRIEND_A,
        title: "미완료 목표",
        currentValue: 3,
        targetValue: 10,
        updatedAt: new Date("2026-08-20T02:00:00Z"),
        user: { name: "A", image: null },
      },
    ]);

    const result = await getFriendActivityFeed(VIEWER, "Asia/Seoul");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ kind: "goal_completed", id: "g1" });
    expect(result[1]).toMatchObject({ kind: "study_session", id: "s1" });
  });
});
