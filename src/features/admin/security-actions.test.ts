import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * IP ban management is one of the two most operationally dangerous admin
 * surfaces flagged in the codebase audit (the other is user bans, covered in
 * user-actions.test.ts). clearMyIpBlock() is the lockout-recovery shortcut —
 * it must NEVER throw, or a locked-out operator loses their only way back in.
 */
vi.mock("server-only", () => ({}));

const { blockedIp } = vi.hoisted(() => ({
  blockedIp: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { blockedIp } }));

const { requireCapability, getRequestIp } = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  getRequestIp: vi.fn(),
}));
vi.mock("@/lib/admin/context", () => ({ requireCapability, getRequestIp }));

const { logAdminActivity } = vi.hoisted(() => ({ logAdminActivity: vi.fn() }));
vi.mock("@/lib/admin/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/activity")>();
  return { ...actual, logAdminActivity };
});

const { setSetting } = vi.hoisted(() => ({ setSetting: vi.fn() }));
vi.mock("@/lib/admin/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/settings")>();
  return { ...actual, setSetting };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import {
  blockIp,
  clearAdminSessions,
  clearMyIpBlock,
  deleteBan,
  unblockIp,
} from "@/features/admin/security-actions";

const ADMIN = { id: "admin-1", role: "SUPER_ADMIN" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCapability.mockResolvedValue(ADMIN);
  logAdminActivity.mockResolvedValue(undefined);
  getRequestIp.mockResolvedValue("1.2.3.4");
});

describe("clearMyIpBlock — lockout recovery shortcut", () => {
  it("never throws, even when the DB call fails", async () => {
    blockedIp.updateMany.mockRejectedValue(new Error("db down"));

    await expect(clearMyIpBlock()).resolves.toEqual({ removed: 0 });
  });

  it("returns 0 without a DB call when the caller's IP is unknown", async () => {
    getRequestIp.mockResolvedValue("unknown");

    const res = await clearMyIpBlock();

    expect(res).toEqual({ removed: 0 });
    expect(blockedIp.updateMany).not.toHaveBeenCalled();
  });

  it("clears the block for the caller's own IP", async () => {
    blockedIp.updateMany.mockResolvedValue({ count: 1 });

    const res = await clearMyIpBlock();

    expect(res).toEqual({ removed: 1 });
    expect(blockedIp.updateMany).toHaveBeenCalledWith({
      where: { ip: "1.2.3.4", active: true },
      data: { active: false },
    });
  });
});

describe("blockIp", () => {
  it("rejects an already-active ban without a second write", async () => {
    blockedIp.findUnique.mockResolvedValue({ active: true });

    const res = await blockIp({ ip: "5.6.7.8", permanent: true });

    expect(res.error).toBe("이미 차단된 IP입니다.");
    expect(blockedIp.upsert).not.toHaveBeenCalled();
  });

  it("returns a safe error instead of throwing when the DB write fails", async () => {
    blockedIp.findUnique.mockResolvedValue(null);
    blockedIp.upsert.mockRejectedValue(new Error("connection refused"));

    await expect(blockIp({ ip: "5.6.7.8", permanent: true })).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });

  it("blocks a valid IP", async () => {
    blockedIp.findUnique.mockResolvedValue(null);
    blockedIp.upsert.mockResolvedValue({});

    const res = await blockIp({ ip: "5.6.7.8", permanent: true, reason: "abuse" });

    expect(res).toEqual({});
    expect(blockedIp.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("unblockIp / deleteBan", () => {
  it("unblockIp 404s on a missing record without writing", async () => {
    blockedIp.findUnique.mockResolvedValue(null);

    const res = await unblockIp("ban-1");

    expect(res.error).toBe("차단 기록을 찾을 수 없습니다.");
    expect(blockedIp.update).not.toHaveBeenCalled();
  });

  it("deleteBan never throws on a DB failure", async () => {
    blockedIp.findUnique.mockResolvedValue({ id: "ban-1", ip: "5.6.7.8" });
    blockedIp.delete.mockRejectedValue(new Error("db down"));

    await expect(deleteBan("ban-1")).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });
});

describe("clearAdminSessions", () => {
  it("never throws when the setting write fails", async () => {
    setSetting.mockRejectedValue(new Error("db down"));

    await expect(clearAdminSessions()).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });
});
