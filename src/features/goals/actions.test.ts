import { beforeEach, describe, expect, it, vi } from "vitest";

const { goal, subject } = vi.hoisted(() => ({
  goal: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  subject: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { goal, subject } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { onGoalCompleted } = vi.hoisted(() => ({ onGoalCompleted: vi.fn() }));
vi.mock("@/features/growth/hooks", () => ({ onGoalCompleted }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createGoal, incrementGoalProgress } from "@/features/goals/actions";

const USER = { id: "user-1", timezone: "Asia/Seoul" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
});

describe("createGoal — subject ownership", () => {
  it("scopes the subject lookup to the caller, not an arbitrary subjectId", async () => {
    subject.findFirst.mockResolvedValue(null); // not owned / doesn't exist
    goal.create.mockResolvedValue({});

    await createGoal({
      title: "수학 30분",
      targetValue: 30,
      unit: "분",
      subjectId: "someone-elses-subject",
    });

    expect(subject.findFirst).toHaveBeenCalledWith({
      where: { id: "someone-elses-subject", userId: "user-1" },
    });
    // Falls back to null rather than trusting the client-supplied subjectId.
    expect(goal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subjectId: null }) }),
    );
  });
});

describe("incrementGoalProgress", () => {
  it("no-ops for a goal that doesn't belong to the caller", async () => {
    goal.findFirst.mockResolvedValue(null);

    await incrementGoalProgress("goal-1", 5);

    expect(goal.update).not.toHaveBeenCalled();
  });

  it("increments atomically via Prisma's `increment`, not a read-then-write of currentValue", async () => {
    // Regression: the previous implementation read goal.currentValue, added
    // delta in JS, and wrote that back — a classic lost-update race under
    // concurrent calls. The fix delegates the add itself to the DB.
    goal.findFirst.mockResolvedValue({ targetValue: 10 });
    goal.update.mockResolvedValueOnce({ currentValue: 5 }); // within bounds already

    await incrementGoalProgress("goal-1", 5);

    expect(goal.update).toHaveBeenNthCalledWith(1, {
      where: { id: "goal-1" },
      data: { currentValue: { increment: 5 } },
      select: { currentValue: true },
    });
    // No clamp needed — only one update call.
    expect(goal.update).toHaveBeenCalledTimes(1);
  });

  it("clamps progress down to the target value after an over-shoot", async () => {
    goal.findFirst.mockResolvedValue({ targetValue: 10 });
    goal.update.mockResolvedValueOnce({ currentValue: 108 });

    await incrementGoalProgress("goal-1", 100);

    expect(goal.update).toHaveBeenNthCalledWith(2, {
      where: { id: "goal-1" },
      data: { currentValue: 10 },
    });
  });

  it("never drops progress below 0", async () => {
    goal.findFirst.mockResolvedValue({ targetValue: 10 });
    goal.update.mockResolvedValueOnce({ currentValue: -98 });

    await incrementGoalProgress("goal-1", -100);

    expect(goal.update).toHaveBeenNthCalledWith(2, {
      where: { id: "goal-1" },
      data: { currentValue: 0 },
    });
  });

  describe("Growth integration", () => {
    it("awards Growth XP once the goal reaches its target", async () => {
      goal.findFirst.mockResolvedValue({ targetValue: 10 });
      goal.update.mockResolvedValueOnce({ currentValue: 10 });

      await incrementGoalProgress("goal-1", 10);

      expect(onGoalCompleted).toHaveBeenCalledWith("user-1", "goal-1");
    });

    it("does not award Growth XP while still below target", async () => {
      goal.findFirst.mockResolvedValue({ targetValue: 10 });
      goal.update.mockResolvedValueOnce({ currentValue: 5 });

      await incrementGoalProgress("goal-1", 5);

      expect(onGoalCompleted).not.toHaveBeenCalled();
    });

    it("safely calls onGoalCompleted again on a later increment against an already-completed goal (idempotency lives in awardXp, not here)", async () => {
      goal.findFirst.mockResolvedValue({ targetValue: 10 });
      goal.update.mockResolvedValueOnce({ currentValue: 10 });

      await incrementGoalProgress("goal-1", 1); // e.g. a stray extra increment call

      expect(onGoalCompleted).toHaveBeenCalledWith("user-1", "goal-1");
    });
  });
});
