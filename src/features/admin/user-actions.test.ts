import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * banUser/unbanUser/promoteUser/demoteUser are the highest-risk admin actions
 * (account ban, privilege grant/revoke) and previously had zero try/catch —
 * a DB failure mid-action threw past the Server Action into an unhandled
 * client rejection with no feedback. Covers: the safety guards (self-protect,
 * last-super-admin), and that a DB failure now always resolves to
 * {error} instead of throwing.
 */
vi.mock("server-only", () => ({}));

const { user, adminUser } = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  adminUser: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { user, adminUser } }));

const { requireCapability } = vi.hoisted(() => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/admin/context", () => ({ requireCapability }));

const { logAdminActivity } = vi.hoisted(() => ({ logAdminActivity: vi.fn() }));
vi.mock("@/lib/admin/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/activity")>();
  return { ...actual, logAdminActivity };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/features/auth/password", () => ({
  hashPassword: vi.fn(async () => "hashed"),
}));

import {
  banUser,
  demoteUser,
  promoteUser,
  unbanUser,
} from "@/features/admin/user-actions";

const ADMIN = { id: "admin-1", role: "SUPER_ADMIN" };
const TARGET_USER = { id: "user-1", email: "student@example.com", name: "학생" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCapability.mockResolvedValue(ADMIN);
  logAdminActivity.mockResolvedValue(undefined);
});

describe("banUser", () => {
  it("bans the user and logs the action", async () => {
    user.findUnique.mockResolvedValue(TARGET_USER);
    user.update.mockResolvedValue({});

    const res = await banUser({ userId: "user-1", reason: "스팸" });

    expect(res).toEqual({});
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { bannedAt: expect.any(Date), banReason: "스팸" },
    });
  });

  it("returns a safe error instead of throwing when the DB update fails", async () => {
    user.findUnique.mockResolvedValue(TARGET_USER);
    user.update.mockRejectedValue(new Error("connection refused"));

    await expect(banUser({ userId: "user-1", reason: "" })).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });

  it("returns an error for a nonexistent user without touching the DB write", async () => {
    user.findUnique.mockResolvedValue(null);

    const res = await banUser({ userId: "missing", reason: "" });

    expect(res.error).toBe("사용자를 찾을 수 없습니다.");
    expect(user.update).not.toHaveBeenCalled();
  });
});

describe("demoteUser — self-protection guards", () => {
  it("refuses to demote the caller's own admin access", async () => {
    user.findUnique.mockResolvedValue(TARGET_USER);
    adminUser.findUnique.mockResolvedValue({
      id: "admin-1",
      isActive: true,
      role: "ADMIN",
    });

    const res = await demoteUser("user-1");

    expect(res.error).toBe("자기 자신의 관리자 권한은 해제할 수 없습니다.");
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it("refuses to demote the last active SUPER_ADMIN", async () => {
    user.findUnique.mockResolvedValue(TARGET_USER);
    adminUser.findUnique.mockResolvedValue({
      id: "other-admin",
      isActive: true,
      role: "SUPER_ADMIN",
    });
    adminUser.count.mockResolvedValue(1);

    const res = await demoteUser("user-1");

    expect(res.error).toBe("마지막 슈퍼 관리자는 해제할 수 없습니다.");
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it("demotes a non-last, non-self admin", async () => {
    user.findUnique.mockResolvedValue(TARGET_USER);
    adminUser.findUnique.mockResolvedValue({
      id: "other-admin",
      isActive: true,
      role: "ADMIN",
    });
    adminUser.update.mockResolvedValue({});

    const res = await demoteUser("user-1");

    expect(res).toEqual({});
    expect(adminUser.update).toHaveBeenCalledWith({
      where: { id: "other-admin" },
      data: { isActive: false },
    });
  });

  it("never throws even if the DB blows up mid-check", async () => {
    user.findUnique.mockRejectedValue(new Error("db down"));

    await expect(demoteUser("user-1")).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });
});

describe("promoteUser", () => {
  it("refuses to re-promote an already-active admin", async () => {
    user.findUnique.mockResolvedValue(TARGET_USER);
    adminUser.findUnique.mockResolvedValue({ isActive: true });

    const res = await promoteUser({
      userId: "user-1",
      role: "ADMIN",
      password: "x".repeat(12),
    });

    expect(res.error).toBe("이미 관리자로 지정된 사용자입니다.");
    expect(adminUser.upsert).not.toHaveBeenCalled();
  });
});

describe("unbanUser", () => {
  it("clears the ban", async () => {
    user.findUnique.mockResolvedValue({ ...TARGET_USER, bannedAt: new Date() });
    user.update.mockResolvedValue({});

    const res = await unbanUser("user-1");

    expect(res).toEqual({});
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { bannedAt: null, banReason: null },
    });
  });
});
