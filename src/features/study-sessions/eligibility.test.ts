import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  finalizeEligibleDuration,
  MAX_VERIFIED_GAP_SEC,
  stampActiveSessionCheckpoint,
} from "@/features/study-sessions/eligibility";

vi.mock("server-only", () => ({}));

const { studySession } = vi.hoisted(() => ({
  studySession: { findFirst: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { studySession } }));

const START = new Date("2026-09-20T05:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("finalizeEligibleDuration (pure policy)", () => {
  it("credits raw duration for a short session that never heartbeated (finishes before the first ping)", () => {
    const endedAt = new Date(START.getTime() + 5 * 60 * 1000);
    const eligible = finalizeEligibleDuration(
      { startedAt: START, lastVerifiedAt: null, rewardEligibleDurationSec: 0 },
      endedAt,
    );
    expect(eligible).toBe(5 * 60);
  });

  it("credits NOTHING for a long session with no presence proof (the 'started the timer and left' case)", () => {
    const endedAt = new Date(START.getTime() + 45 * 60 * 1000);
    const eligible = finalizeEligibleDuration(
      { startedAt: START, lastVerifiedAt: null, rewardEligibleDurationSec: 0 },
      endedAt,
    );
    expect(eligible).toBe(0);
  });

  it("adds the contiguous tail to the accumulated verified time when the final span is within the window", () => {
    const lastVerifiedAt = new Date(START.getTime() + 5 * 60 * 1000);
    const endedAt = new Date(START.getTime() + 10 * 60 * 1000);
    const eligible = finalizeEligibleDuration(
      { startedAt: START, lastVerifiedAt, rewardEligibleDurationSec: 5 * 60 },
      endedAt,
    );
    expect(eligible).toBe(10 * 60);
  });

  it("credits the tail when the final span is exactly at the window boundary", () => {
    const endedAt = new Date(START.getTime() + MAX_VERIFIED_GAP_SEC * 1000);
    const eligible = finalizeEligibleDuration(
      { startedAt: START, lastVerifiedAt: START, rewardEligibleDurationSec: 0 },
      endedAt,
    );
    expect(eligible).toBe(MAX_VERIFIED_GAP_SEC);
  });

  it("drops the tail but keeps accumulated time when the user was absent at close", () => {
    const lastVerifiedAt = new Date(START.getTime() + 20 * 60 * 1000);
    const endedAt = new Date(START.getTime() + 41 * 60 * 1000);
    const eligible = finalizeEligibleDuration(
      { startedAt: START, lastVerifiedAt, rewardEligibleDurationSec: 20 * 60 },
      endedAt,
    );
    expect(eligible).toBe(20 * 60);
  });
});

describe("stampActiveSessionCheckpoint (heartbeat integration)", () => {
  it("does nothing when the user has no active session", async () => {
    studySession.findFirst.mockResolvedValue(null);

    await stampActiveSessionCheckpoint("user-1", START);

    expect(studySession.updateMany).not.toHaveBeenCalled();
  });

  it("credits a heartbeat gap within the window and moves the checkpoint forward", async () => {
    const now = new Date(START.getTime() + 90 * 1000); // 90s after start
    studySession.findFirst.mockResolvedValue({
      id: "session-1",
      startedAt: START,
      lastVerifiedAt: null,
      rewardEligibleDurationSec: 0,
    });

    await stampActiveSessionCheckpoint("user-1", now);

    expect(studySession.updateMany).toHaveBeenCalledWith({
      where: { id: "session-1", endedAt: null, lastVerifiedAt: START },
      data: { rewardEligibleDurationSec: { increment: 90 }, lastVerifiedAt: now },
    });
  });

  it("never credits a gap beyond the window — only the checkpoint moves", async () => {
    const now = new Date(START.getTime() + 30 * 60 * 1000); // away for 30min
    studySession.findFirst.mockResolvedValue({
      id: "session-1",
      startedAt: START,
      lastVerifiedAt: START,
      rewardEligibleDurationSec: 0,
    });

    await stampActiveSessionCheckpoint("user-1", now);

    expect(studySession.updateMany).toHaveBeenCalledWith({
      where: { id: "session-1", endedAt: null, lastVerifiedAt: START },
      data: { lastVerifiedAt: now },
    });
  });

  it("guards the increment with optimistic concurrency (concurrent stamps can't double-credit one interval)", async () => {
    // Two overlapping heartbeats both read the same base checkpoint before
    // either writes. The update is guarded on `lastVerifiedAt: base`, so only
    // the first stamp to land credits the interval; assert the guard exists
    // for BOTH the crediting path and the move-checkpoint-only path.
    const now = new Date(START.getTime() + 90 * 1000);
    const staleToo = new Date(START.getTime() + 30 * 60 * 1000);
    studySession.findFirst
      .mockResolvedValueOnce({
        id: "session-1",
        startedAt: START,
        lastVerifiedAt: null,
        rewardEligibleDurationSec: 0,
      })
      .mockResolvedValueOnce({
        id: "session-1",
        startedAt: START,
        lastVerifiedAt: START,
        rewardEligibleDurationSec: 0,
      });

    await stampActiveSessionCheckpoint("user-1", now);
    await stampActiveSessionCheckpoint("user-1", staleToo);

    expect(studySession.updateMany).toHaveBeenCalledTimes(2);
    const [creditingCall, movingCall] = studySession.updateMany.mock.calls;
    expect(creditingCall![0].where.lastVerifiedAt).toEqual(START);
    expect(creditingCall![0].data.rewardEligibleDurationSec).toEqual({ increment: 90 });
    expect(movingCall![0].where.lastVerifiedAt).toEqual(START);
    expect(movingCall![0].data).toEqual({ lastVerifiedAt: staleToo });
  });

  it("no-ops when the heartbeat does not advance the clock", async () => {
    studySession.findFirst.mockResolvedValue({
      id: "session-1",
      startedAt: START,
      lastVerifiedAt: START,
      rewardEligibleDurationSec: 0,
    });

    await stampActiveSessionCheckpoint("user-1", START);

    expect(studySession.updateMany).not.toHaveBeenCalled();
  });
});
