import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { awardXp } = vi.hoisted(() => ({ awardXp: vi.fn() }));
vi.mock("@/features/growth/xp", () => ({
  awardXp,
  studyTimeXp: (durationSec: number) => Math.floor(Math.max(0, durationSec) / 1800) * 20,
  XP_AMOUNTS: { PROBLEM_SOLVED: 2, REVIEW_COMPLETED: 10, GOAL_COMPLETED: 30, ALL_MISSIONS_BONUS: 100 },
}));

const { progressMissionsByType } = vi.hoisted(() => ({ progressMissionsByType: vi.fn() }));
vi.mock("@/features/growth/mission-progress", () => ({ progressMissionsByType }));

vi.mock("@/lib/date", () => ({ getZonedDateString: () => "2026-08-21" }));

import {
  onGoalCompleted,
  onProblemAttemptRecorded,
  onReviewCompleted,
  onStudySessionCompleted,
} from "@/features/growth/hooks";

const TZ = "Asia/Seoul";

beforeEach(() => {
  vi.clearAllMocks();
  awardXp.mockResolvedValue({ awarded: true, totalXp: 100 });
});

describe("onStudySessionCompleted", () => {
  it("awards STUDY_TIME XP keyed by the session id and progresses STUDY_TIME missions in minutes", async () => {
    await onStudySessionCompleted("user-1", "session-1", 45 * 60, TZ);

    expect(awardXp).toHaveBeenCalledWith({
      userId: "user-1",
      type: "STUDY_TIME",
      amount: 20,
      sourceId: "session-1",
    });
    expect(progressMissionsByType).toHaveBeenCalledWith("user-1", "STUDY_TIME", 45, TZ);
  });

  it("is a no-op for a session under a minute (no XP call, no mission progress)", async () => {
    await onStudySessionCompleted("user-1", "session-1", 10, TZ);
    expect(awardXp).not.toHaveBeenCalled();
    expect(progressMissionsByType).not.toHaveBeenCalled();
  });

  it("still progresses mission minutes even when the session is too short for XP (e.g. 5 minutes)", async () => {
    await onStudySessionCompleted("user-1", "session-1", 5 * 60, TZ);
    expect(awardXp).not.toHaveBeenCalled(); // < 30 min chunk
    expect(progressMissionsByType).toHaveBeenCalledWith("user-1", "STUDY_TIME", 5, TZ);
  });
});

describe("onProblemAttemptRecorded", () => {
  it("awards PROBLEM_SOLVED XP keyed by problem+day and advances PROBLEM_COUNT missions", async () => {
    await onProblemAttemptRecorded("user-1", "problem-1", TZ);

    expect(awardXp).toHaveBeenCalledWith({
      userId: "user-1",
      type: "PROBLEM_SOLVED",
      amount: 2,
      sourceId: "problem-1:2026-08-21",
    });
    expect(progressMissionsByType).toHaveBeenCalledWith("user-1", "PROBLEM_COUNT", 1, TZ);
  });

  it("does NOT advance mission progress when the XP was a duplicate (same problem resubmitted today)", async () => {
    awardXp.mockResolvedValue({ awarded: false, totalXp: 100 });

    await onProblemAttemptRecorded("user-1", "problem-1", TZ);

    expect(progressMissionsByType).not.toHaveBeenCalled();
  });
});

describe("onReviewCompleted", () => {
  it("awards REVIEW_COMPLETED XP keyed by wrongAnswer+stage and advances REVIEW_COUNT missions", async () => {
    await onReviewCompleted("user-1", "wa-1", 2, TZ);

    expect(awardXp).toHaveBeenCalledWith({
      userId: "user-1",
      type: "REVIEW_COMPLETED",
      amount: 10,
      sourceId: "wa-1:2",
    });
    expect(progressMissionsByType).toHaveBeenCalledWith("user-1", "REVIEW_COUNT", 1, TZ);
  });

  it("does not advance mission progress when the stage-keyed XP was already granted", async () => {
    awardXp.mockResolvedValue({ awarded: false, totalXp: 100 });
    await onReviewCompleted("user-1", "wa-1", 2, TZ);
    expect(progressMissionsByType).not.toHaveBeenCalled();
  });
});

describe("onGoalCompleted", () => {
  it("awards GOAL_COMPLETED XP keyed by the goal id", async () => {
    await onGoalCompleted("user-1", "goal-1");
    expect(awardXp).toHaveBeenCalledWith({
      userId: "user-1",
      type: "GOAL_COMPLETED",
      amount: 30,
      sourceId: "goal-1",
    });
  });
});
