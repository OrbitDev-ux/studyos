import { beforeEach, describe, expect, it, vi } from "vitest";

/** createAdmin/updateAdminRole/deleteAdmin — privilege management, previously
 * unguarded. Covers the last-super-admin/self-protection guards plus the new
 * try/catch safety net. */
vi.mock("server-only", () => ({}));

const { adminUser } = vi.hoisted(() => ({
  adminUser: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { adminUser } }));

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
  createAdmin,
  deleteAdmin,
  updateAdminRole,
} from "@/features/admin/admin-actions";

const CALLER = { id: "admin-1", role: "SUPER_ADMIN" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCapability.mockResolvedValue(CALLER);
  logAdminActivity.mockResolvedValue(undefined);
});

describe("createAdmin", () => {
  it("rejects a duplicate active email without writing", async () => {
    adminUser.findUnique.mockResolvedValue({ isActive: true });

    const res = await createAdmin({
      email: "a@b.com",
      name: "A",
      password: "x".repeat(12),
      role: "ADMIN",
    });

    expect(res.error).toBe("이미 사용 중인 이메일입니다.");
    expect(adminUser.upsert).not.toHaveBeenCalled();
  });

  it("never throws when the DB write fails", async () => {
    adminUser.findUnique.mockResolvedValue(null);
    adminUser.upsert.mockRejectedValue(new Error("db down"));

    await expect(
      createAdmin({
        email: "a@b.com",
        name: "A",
        password: "x".repeat(12),
        role: "ADMIN",
      }),
    ).resolves.toEqual({ error: "일시적인 오류가 발생했어요. 다시 시도해주세요." });
  });
});

describe("updateAdminRole — safety guards", () => {
  it("refuses to change the caller's own role", async () => {
    adminUser.findUnique.mockResolvedValue({
      id: "admin-1",
      isActive: true,
      role: "ADMIN",
    });

    const res = await updateAdminRole({ adminId: "admin-1", role: "MODERATOR" });

    expect(res.error).toBe("자기 자신의 역할은 변경할 수 없습니다.");
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it("refuses to demote the last SUPER_ADMIN out of that role", async () => {
    adminUser.findUnique.mockResolvedValue({
      id: "other",
      isActive: true,
      role: "SUPER_ADMIN",
    });
    adminUser.count.mockResolvedValue(1);

    const res = await updateAdminRole({ adminId: "other", role: "ADMIN" });

    expect(res.error).toBe("마지막 슈퍼 관리자의 역할은 변경할 수 없습니다.");
    expect(adminUser.update).not.toHaveBeenCalled();
  });
});

describe("deleteAdmin — safety guards", () => {
  it("refuses to delete the caller", async () => {
    adminUser.findUnique.mockResolvedValue({
      id: "admin-1",
      isActive: true,
      role: "ADMIN",
    });

    const res = await deleteAdmin("admin-1");

    expect(res.error).toBe("자기 자신은 삭제할 수 없습니다.");
  });

  it("refuses to delete the last SUPER_ADMIN", async () => {
    adminUser.findUnique.mockResolvedValue({
      id: "other",
      isActive: true,
      role: "SUPER_ADMIN",
    });
    adminUser.count.mockResolvedValue(1);

    const res = await deleteAdmin("other");

    expect(res.error).toBe("마지막 슈퍼 관리자는 삭제할 수 없습니다.");
  });

  it("deactivates a non-protected admin", async () => {
    adminUser.findUnique.mockResolvedValue({
      id: "other",
      isActive: true,
      role: "ADMIN",
    });
    adminUser.update.mockResolvedValue({});

    const res = await deleteAdmin("other");

    expect(res).toEqual({});
    expect(adminUser.update).toHaveBeenCalledWith({
      where: { id: "other" },
      data: { isActive: false },
    });
  });
});
