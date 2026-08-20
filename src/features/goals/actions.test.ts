import { beforeEach, describe, expect, it, vi } from "vitest";

const { goal, subject } = vi.hoisted(() => ({
  goal: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  subject: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { goal, subject } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

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

  it("clamps progress between 0 and the target value", async () => {
    goal.findFirst.mockResolvedValue({ id: "goal-1", targetValue: 10, currentValue: 8 });

    await incrementGoalProgress("goal-1", 100);

    expect(goal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { currentValue: 10 },
    });
  });

  it("never drops progress below 0", async () => {
    goal.findFirst.mockResolvedValue({ id: "goal-1", targetValue: 10, currentValue: 2 });

    await incrementGoalProgress("goal-1", -100);

    expect(goal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { currentValue: 0 },
    });
  });
});
