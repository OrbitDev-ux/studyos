import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const { growthXpEvent, userGrowth, transaction } = vi.hoisted(() => {
  const growthXpEvent = { create: vi.fn() };
  const userGrowth = { upsert: vi.fn(), findUnique: vi.fn() };
  return {
    growthXpEvent,
    userGrowth,
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ growthXpEvent, userGrowth })),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { growthXpEvent, userGrowth, $transaction: transaction } }));

import { awardXp, studyTimeXp } from "@/features/growth/xp";

function duplicateSourceError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.0.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("studyTimeXp", () => {
  it("awards 0 for a session shorter than one 30-minute chunk", () => {
    expect(studyTimeXp(60)).toBe(0);
    expect(studyTimeXp(29 * 60)).toBe(0);
  });

  it("awards 20 XP per full 30-minute chunk, floored", () => {
    expect(studyTimeXp(30 * 60)).toBe(20);
    expect(studyTimeXp(59 * 60)).toBe(20); // not yet a second full chunk
    expect(studyTimeXp(60 * 60)).toBe(40);
    expect(studyTimeXp(90 * 60)).toBe(60);
  });

  it("never goes negative for a negative/zero duration", () => {
    expect(studyTimeXp(0)).toBe(0);
    expect(studyTimeXp(-100)).toBe(0);
  });
});

describe("awardXp", () => {
  it("grants XP and updates the cached total on a fresh source", async () => {
    growthXpEvent.create.mockResolvedValue({ id: "evt-1" });
    userGrowth.upsert.mockResolvedValue({ userId: "user-1", totalXp: 52 });

    const result = await awardXp({
      userId: "user-1",
      type: "PROBLEM_SOLVED",
      amount: 2,
      sourceId: "problem-1:2026-08-21",
    });

    expect(result).toEqual({ awarded: true, totalXp: 52 });
    expect(growthXpEvent.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "PROBLEM_SOLVED",
        amount: 2,
        sourceId: "problem-1:2026-08-21",
        metadata: undefined,
      },
    });
    expect(userGrowth.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", totalXp: 2 },
      update: { totalXp: { increment: 2 } },
    });
  });

  it("is idempotent: a duplicate sourceId is a safe no-op that returns the current total, not an error", async () => {
    growthXpEvent.create.mockRejectedValue(duplicateSourceError());
    userGrowth.findUnique.mockResolvedValue({ userId: "user-1", totalXp: 52 });

    const result = await awardXp({
      userId: "user-1",
      type: "PROBLEM_SOLVED",
      amount: 2,
      sourceId: "problem-1:2026-08-21",
    });

    expect(result).toEqual({ awarded: false, totalXp: 52 });
    // The cache must NOT be touched again for a duplicate — only one write path.
    expect(userGrowth.upsert).not.toHaveBeenCalled();
  });

  it("calling it twice back-to-back for the same activity only ever increases totalXp once", async () => {
    // Simulates two "duplicate submit" calls in sequence, matching how a
    // double-click/refresh-replay would actually reach this function twice.
    growthXpEvent.create.mockResolvedValueOnce({ id: "evt-1" });
    userGrowth.upsert.mockResolvedValueOnce({ userId: "user-1", totalXp: 10 });
    const first = await awardXp({
      userId: "user-1",
      type: "REVIEW_COMPLETED",
      amount: 10,
      sourceId: "wa-1:1",
    });

    growthXpEvent.create.mockRejectedValueOnce(duplicateSourceError());
    userGrowth.findUnique.mockResolvedValueOnce({ userId: "user-1", totalXp: 10 });
    const second = await awardXp({
      userId: "user-1",
      type: "REVIEW_COMPLETED",
      amount: 10,
      sourceId: "wa-1:1",
    });

    expect(first).toEqual({ awarded: true, totalXp: 10 });
    expect(second).toEqual({ awarded: false, totalXp: 10 });
    expect(userGrowth.upsert).toHaveBeenCalledTimes(1);
  });

  it("propagates a genuinely unexpected DB error instead of silently swallowing it", async () => {
    growthXpEvent.create.mockRejectedValue(new Error("connection reset"));
    await expect(
      awardXp({ userId: "user-1", type: "GOAL_COMPLETED", amount: 30, sourceId: "goal-1" }),
    ).rejects.toThrow("connection reset");
  });

  it("runs inside a caller-supplied transaction client without opening a nested transaction", async () => {
    const txGrowthXpEvent = { create: vi.fn().mockResolvedValue({ id: "evt-2" }) };
    const txUserGrowth = {
      upsert: vi.fn().mockResolvedValue({ userId: "user-1", totalXp: 100 }),
      findUnique: vi.fn(),
    };
    const tx = { growthXpEvent: txGrowthXpEvent, userGrowth: txUserGrowth } as never;

    const result = await awardXp(
      { userId: "user-1", type: "MISSION_COMPLETED", amount: 50, sourceId: "mission-1" },
      tx,
    );

    expect(result).toEqual({ awarded: true, totalXp: 100 });
    expect(transaction).not.toHaveBeenCalled(); // no nested $transaction call
    expect(txGrowthXpEvent.create).toHaveBeenCalledTimes(1);
  });
});
