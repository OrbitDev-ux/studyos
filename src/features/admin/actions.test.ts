import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * verifyAdminCode/verifyAdminCredentials are the admin login paths — the
 * front door to every other admin capability. Previously unguarded past the
 * ban/rate-limit checks. Must fail CLOSED: any unexpected error must never
 * grant access.
 */
vi.mock("server-only", () => ({}));

const { adminUser, adminLoginAttempt } = vi.hoisted(() => ({
  adminUser: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  adminLoginAttempt: { create: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { adminUser, adminLoginAttempt } }));

const { findActiveBan, logBanCheck } = vi.hoisted(() => ({
  findActiveBan: vi.fn(),
  logBanCheck: vi.fn(),
}));
vi.mock("@/features/admin/ip-ban", () => ({ findActiveBan, logBanCheck }));

const { getCurrentAdmin, getRequestIp } = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  getRequestIp: vi.fn(),
}));
vi.mock("@/lib/admin/context", () => ({ getCurrentAdmin, getRequestIp }));

const { logAdminActivity } = vi.hoisted(() => ({ logAdminActivity: vi.fn() }));
vi.mock("@/lib/admin/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/activity")>();
  return { ...actual, logAdminActivity };
});

const { createAdminSessionToken } = vi.hoisted(() => ({
  createAdminSessionToken: vi.fn(async () => "token"),
}));
vi.mock("@/lib/admin/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/session")>();
  return { ...actual, createAdminSessionToken };
});

const { hashPassword, verifyPassword } = vi.hoisted(() => ({
  hashPassword: vi.fn(async () => "hashed"),
  verifyPassword: vi.fn(async () => false),
}));
vi.mock("@/features/auth/password", () => ({ hashPassword, verifyPassword }));

const { cookieSet } = vi.hoisted(() => ({ cookieSet: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: cookieSet, delete: vi.fn() })),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { verifyAdminCode, verifyAdminCredentials } from "@/features/admin/actions";

const OLD_ENV = process.env.ADMIN_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_SECRET = "correct-passphrase";
  findActiveBan.mockResolvedValue(null);
  getRequestIp.mockResolvedValue("1.2.3.4");
  adminLoginAttempt.count.mockResolvedValue(0);
  adminLoginAttempt.create.mockResolvedValue({});
});

afterAll(() => {
  process.env.ADMIN_SECRET = OLD_ENV;
});

describe("verifyAdminCode", () => {
  it("blocks a banned IP before checking the passphrase at all", async () => {
    findActiveBan.mockResolvedValue({ id: "ban-1" });

    const res = await verifyAdminCode({ code: "correct-passphrase" });

    expect(res.error).toBe("차단된 접근입니다.");
    expect(adminLoginAttempt.create).not.toHaveBeenCalled();
  });

  it("rate-limits after too many recent failures", async () => {
    adminLoginAttempt.count.mockResolvedValue(10);

    const res = await verifyAdminCode({ code: "correct-passphrase" });

    expect(res.error).toBe("잠시 후 다시 시도해주세요.");
  });

  it("rejects a wrong passphrase", async () => {
    const res = await verifyAdminCode({ code: "wrong" });

    expect(res.error).toBe("인증 정보가 올바르지 않습니다.");
    expect(adminUser.upsert).not.toHaveBeenCalled();
  });

  it("fails closed instead of granting access when the DB throws", async () => {
    adminLoginAttempt.create.mockRejectedValue(new Error("db down"));

    const res = await verifyAdminCode({ code: "correct-passphrase" });

    expect(res.error).toBe("인증 정보가 올바르지 않습니다.");
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("signs in the bootstrap admin on a correct passphrase", async () => {
    adminUser.upsert.mockResolvedValue({ id: "boot-admin", role: "SUPER_ADMIN" });

    const res = await verifyAdminCode({ code: "correct-passphrase" });

    expect(res).toEqual({});
    expect(cookieSet).toHaveBeenCalledTimes(1);
  });
});

describe("verifyAdminCredentials", () => {
  it("fails closed instead of granting access when the DB throws", async () => {
    adminUser.findUnique.mockRejectedValue(new Error("db down"));

    const res = await verifyAdminCredentials({
      email: "a@b.com",
      password: "x".repeat(10),
    });

    expect(res.error).toBe("인증 정보가 올바르지 않습니다.");
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("rejects an inactive admin even with a correct password", async () => {
    adminUser.findUnique.mockResolvedValue({
      id: "a1",
      isActive: false,
      passwordHash: "hash",
    });
    verifyPassword.mockResolvedValue(true);

    const res = await verifyAdminCredentials({
      email: "a@b.com",
      password: "x".repeat(10),
    });

    expect(res.error).toBe("인증 정보가 올바르지 않습니다.");
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("signs in on a valid, active credential", async () => {
    adminUser.findUnique.mockResolvedValue({
      id: "a1",
      isActive: true,
      passwordHash: "hash",
      role: "ADMIN",
    });
    verifyPassword.mockResolvedValue(true);

    const res = await verifyAdminCredentials({
      email: "a@b.com",
      password: "x".repeat(10),
    });

    expect(res).toEqual({});
    expect(cookieSet).toHaveBeenCalledTimes(1);
  });
});
