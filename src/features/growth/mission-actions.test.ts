import { beforeEach, describe, expect, it, vi } from "vitest";

const { studyMission, subject } = vi.hoisted(() => ({
  studyMission: { create: vi.fn(), updateMany: vi.fn() },
  subject: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { studyMission, subject } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { completeMissionManually } = vi.hoisted(() => ({ completeMissionManually: vi.fn() }));
vi.mock("@/features/growth/mission-progress", () => ({ completeMissionManually }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { cancelMission, completeMission, createMission } from "@/features/growth/mission-actions";

const USER = { id: "user-1", timezone: "Asia/Seoul" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
});

describe("createMission — authorization & input handling", () => {
  it("always creates the mission under the authenticated user's id, never a client-supplied one", async () => {
    subject.findFirst.mockResolvedValue(null);
    studyMission.create.mockResolvedValue({});

    await createMission({
      title: "수학 문제 20개 풀기",
      type: "PROBLEM_COUNT",
      targetValue: 20,
    } as never);

    expect(studyMission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1" }) }),
    );
  });

  it("never lets the client set xpReward — it's always the fixed default", async () => {
    subject.findFirst.mockResolvedValue(null);
    studyMission.create.mockResolvedValue({});

    await createMission({
      title: "몰래 XP 많이 받기",
      type: "CUSTOM",
      targetValue: 1,
      // @ts-expect-error — intentionally probing that a client-supplied
      // xpReward field is ignored, not just untyped.
      xpReward: 999999,
    });

    expect(studyMission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ xpReward: 50 }) }),
    );
  });

  it("scopes the subject lookup to the caller, falling back to null for a subject the caller doesn't own", async () => {
    subject.findFirst.mockResolvedValue(null);
    studyMission.create.mockResolvedValue({});

    await createMission({
      title: "영어 단어 암기",
      type: "CUSTOM",
      targetValue: 1,
      subjectId: "someone-elses-subject",
    } as never);

    expect(subject.findFirst).toHaveBeenCalledWith({
      where: { id: "someone-elses-subject", userId: "user-1" },
    });
    expect(studyMission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subjectId: null }) }),
    );
  });

  it("caps xpReward at the fixed default regardless of how large targetValue is (targetValue can't be leveraged into abnormal XP)", async () => {
    subject.findFirst.mockResolvedValue(null);
    studyMission.create.mockResolvedValue({});

    await createMission({
      title: "초대형 목표",
      type: "PROBLEM_COUNT",
      targetValue: 100_000,
    } as never);

    expect(studyMission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ xpReward: 50 }) }),
    );
  });

  it("rejects an empty title before ever touching the database", async () => {
    await expect(createMission({ title: "  ", type: "CUSTOM", targetValue: 1 } as never)).rejects.toThrow();
    expect(studyMission.create).not.toHaveBeenCalled();
  });

  it("rejects a non-positive targetValue before ever touching the database", async () => {
    await expect(
      createMission({ title: "제목", type: "CUSTOM", targetValue: 0 } as never),
    ).rejects.toThrow();
    expect(studyMission.create).not.toHaveBeenCalled();
  });
});

describe("completeMission — delegates to the idempotent core, scoped by session userId", () => {
  it("passes the authenticated user's id and timezone, never a client-supplied userId", async () => {
    completeMissionManually.mockResolvedValue({
      mission: { id: "mission-1" },
      wasJustCompleted: true,
    });

    await completeMission("mission-1");

    expect(completeMissionManually).toHaveBeenCalledWith("user-1", "mission-1", "Asia/Seoul");
  });

  it("returns an error instead of throwing when the mission doesn't belong to (or exist for) the caller", async () => {
    completeMissionManually.mockResolvedValue(null);

    const result = await completeMission("someone-elses-mission");

    expect(result).toEqual({ error: "미션을 찾을 수 없습니다." });
  });
});

describe("cancelMission — ownership enforced via the WHERE clause, not a separate check", () => {
  it("scopes the update to (id, userId) so another user's mission matches zero rows", async () => {
    studyMission.updateMany.mockResolvedValue({ count: 0 });

    await cancelMission("someone-elses-mission");

    expect(studyMission.updateMany).toHaveBeenCalledWith({
      where: {
        id: "someone-elses-mission",
        userId: "user-1",
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      data: { status: "CANCELLED" },
    });
  });
});
