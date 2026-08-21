import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { studyMission, transaction } = vi.hoisted(() => {
  const studyMission = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  };
  return {
    studyMission,
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ studyMission })),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { studyMission, $transaction: transaction } }));

const { awardXp } = vi.hoisted(() => ({ awardXp: vi.fn() }));
vi.mock("@/features/growth/xp", () => ({
  awardXp,
  XP_AMOUNTS: { ALL_MISSIONS_BONUS: 100 },
}));

vi.mock("@/lib/date", () => ({
  getTodayRange: () => ({ start: new Date("2026-08-21T00:00:00Z"), end: new Date("2026-08-22T00:00:00Z") }),
  getZonedDateString: () => "2026-08-21",
}));

import { completeMissionManually, progressMissionsByType } from "@/features/growth/mission-progress";

const TZ = "Asia/Seoul";

function mission(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "mission-1",
    userId: "user-1",
    title: "60분 공부",
    type: "CUSTOM",
    status: "PENDING",
    currentValue: 0,
    targetValue: 60,
    xpReward: 50,
    dueAt: null,
    completedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  awardXp.mockResolvedValue({ awarded: true, totalXp: 100 });
});

describe("progressMissionsByType", () => {
  it("is a no-op for a non-positive delta", async () => {
    await progressMissionsByType("user-1", "STUDY_TIME", 0, TZ);
    expect(studyMission.findMany).not.toHaveBeenCalled();
  });

  it("is a no-op when the user has no active mission of that type", async () => {
    studyMission.findMany.mockResolvedValue([]);
    await progressMissionsByType("user-1", "STUDY_TIME", 30, TZ);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("increments matching missions and leaves them IN_PROGRESS below target", async () => {
    studyMission.findMany.mockResolvedValue([{ id: "mission-1" }]);
    studyMission.updateMany.mockResolvedValue({ count: 1 });
    studyMission.findUniqueOrThrow.mockResolvedValue(
      mission({ currentValue: 30, targetValue: 60, status: "PENDING" }),
    );

    await progressMissionsByType("user-1", "STUDY_TIME", 30, TZ);

    expect(studyMission.updateMany).toHaveBeenCalledWith({
      where: { id: "mission-1", status: { in: ["PENDING", "IN_PROGRESS"] } },
      data: { currentValue: { increment: 30 } },
    });
    expect(studyMission.update).toHaveBeenCalledWith({
      where: { id: "mission-1" },
      data: { status: "IN_PROGRESS" },
    });
    expect(awardXp).not.toHaveBeenCalled();
  });

  it("skips a mission another request already moved out of the active statuses (count 0)", async () => {
    studyMission.findMany.mockResolvedValue([{ id: "mission-1" }]);
    studyMission.updateMany.mockResolvedValue({ count: 0 });

    await progressMissionsByType("user-1", "STUDY_TIME", 30, TZ);

    expect(studyMission.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(awardXp).not.toHaveBeenCalled();
  });

  it("completes a mission that reaches its target, clamping currentValue and awarding XP exactly once", async () => {
    studyMission.findMany.mockResolvedValue([{ id: "mission-1" }]);
    studyMission.updateMany.mockResolvedValue({ count: 1 });
    // currentValue overshoots target (65 > 60) — completion must clamp it.
    studyMission.findUniqueOrThrow.mockResolvedValue(
      mission({ currentValue: 65, targetValue: 60, status: "IN_PROGRESS", xpReward: 50 }),
    );

    await progressMissionsByType("user-1", "STUDY_TIME", 35, TZ);

    expect(studyMission.update).toHaveBeenCalledWith({
      where: { id: "mission-1" },
      data: { currentValue: 60, status: "COMPLETED", completedAt: expect.any(Date) },
    });
    expect(awardXp).toHaveBeenCalledWith(
      { userId: "user-1", type: "MISSION_COMPLETED", amount: 50, sourceId: "mission-1" },
      { studyMission },
    );
  });

  it("progresses every matching mission independently when several exist", async () => {
    studyMission.findMany.mockResolvedValue([{ id: "mission-1" }, { id: "mission-2" }]);
    studyMission.updateMany.mockResolvedValue({ count: 1 });
    studyMission.findUniqueOrThrow.mockResolvedValue(
      mission({ currentValue: 10, targetValue: 60 }),
    );

    await progressMissionsByType("user-1", "STUDY_TIME", 10, TZ);

    expect(studyMission.updateMany).toHaveBeenCalledTimes(2);
  });
});

describe("completeMissionManually", () => {
  it("returns null when the mission doesn't belong to the caller (or doesn't exist)", async () => {
    studyMission.findFirst.mockResolvedValue(null);
    const result = await completeMissionManually("user-1", "mission-1", TZ);
    expect(result).toBeNull();
    expect(awardXp).not.toHaveBeenCalled();
  });

  it("is idempotent: an already-COMPLETED mission returns the existing result without re-awarding XP", async () => {
    studyMission.findFirst.mockResolvedValue(mission({ status: "COMPLETED", currentValue: 60 }));

    const result = await completeMissionManually("user-1", "mission-1", TZ);

    expect(result).toEqual({
      mission: mission({ status: "COMPLETED", currentValue: 60 }),
      wasJustCompleted: false,
    });
    expect(studyMission.updateMany).not.toHaveBeenCalled();
    expect(awardXp).not.toHaveBeenCalled();
  });

  it("refuses to manually complete a mission with an automatic progress source (STUDY_TIME/PROBLEM_COUNT/REVIEW_COUNT)", async () => {
    studyMission.findFirst.mockResolvedValue(mission({ type: "STUDY_TIME", status: "IN_PROGRESS" }));

    const result = await completeMissionManually("user-1", "mission-1", TZ);

    expect(result).toEqual({
      mission: mission({ type: "STUDY_TIME", status: "IN_PROGRESS" }),
      wasJustCompleted: false,
    });
    expect(studyMission.updateMany).not.toHaveBeenCalled();
    expect(awardXp).not.toHaveBeenCalled();
  });

  it("completes a pending mission, clamps currentValue to target, and awards XP once", async () => {
    studyMission.findFirst.mockResolvedValue(mission({ status: "PENDING", currentValue: 0 }));
    studyMission.updateMany.mockResolvedValue({ count: 1 });
    studyMission.findUniqueOrThrow.mockResolvedValue(
      mission({ status: "COMPLETED", currentValue: 60, completedAt: new Date() }),
    );

    const result = await completeMissionManually("user-1", "mission-1", TZ);

    expect(studyMission.updateMany).toHaveBeenCalledWith({
      where: { id: "mission-1", userId: "user-1", status: { in: ["PENDING", "IN_PROGRESS"] } },
      data: { currentValue: 60, status: "COMPLETED", completedAt: expect.any(Date) },
    });
    expect(awardXp).toHaveBeenCalledWith(
      { userId: "user-1", type: "MISSION_COMPLETED", amount: 50, sourceId: "mission-1" },
      { studyMission },
    );
    expect(result?.wasJustCompleted).toBe(true);
  });

  it("concurrent duplicate completion: the loser sees count 0 and does not award XP again", async () => {
    studyMission.findFirst.mockResolvedValue(mission({ status: "PENDING" }));
    studyMission.updateMany.mockResolvedValue({ count: 0 }); // another request won the race
    studyMission.findUniqueOrThrow.mockResolvedValue(mission({ status: "COMPLETED" }));

    const result = await completeMissionManually("user-1", "mission-1", TZ);

    expect(result?.wasJustCompleted).toBe(false);
    expect(awardXp).not.toHaveBeenCalled();
  });

  it("checks the daily all-missions bonus after a successful completion", async () => {
    studyMission.findFirst.mockResolvedValue(mission({ status: "PENDING" }));
    studyMission.updateMany
      .mockResolvedValueOnce({ count: 1 }) // the mission's own completion update
      .mockResolvedValueOnce({ count: 0 }); // no other findMany call here — placeholder for shape safety
    studyMission.findUniqueOrThrow
      .mockResolvedValueOnce(mission({ status: "COMPLETED" })) // returned to the caller
      .mockResolvedValueOnce(mission({ status: "COMPLETED" }));
    studyMission.findMany.mockResolvedValue([{ status: "COMPLETED" }]); // maybeAwardAllMissionsBonus's own query

    await completeMissionManually("user-1", "mission-1", TZ);

    expect(awardXp).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ALL_MISSIONS_BONUS", sourceId: "all-missions:2026-08-21" }),
      { studyMission },
    );
  });
});
