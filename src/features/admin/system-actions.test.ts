import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireCapability } = vi.hoisted(() => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/admin/context", () => ({ requireCapability }));

const { setSetting } = vi.hoisted(() => ({ setSetting: vi.fn() }));
vi.mock("@/lib/admin/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/settings")>();
  return { ...actual, setSetting };
});

const { setMaintenance } = vi.hoisted(() => ({ setMaintenance: vi.fn() }));
vi.mock("@/lib/maintenance", () => ({ setMaintenance }));

const { logAdminActivity } = vi.hoisted(() => ({ logAdminActivity: vi.fn() }));
vi.mock("@/lib/admin/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/activity")>();
  return { ...actual, logAdminActivity };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import {
  clearAllAdminSessions,
  clearCache,
  setMaintenanceMode,
} from "@/features/admin/system-actions";

const ADMIN = { id: "admin-1", role: "SUPER_ADMIN" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCapability.mockResolvedValue(ADMIN);
  logAdminActivity.mockResolvedValue(undefined);
});

describe("setMaintenanceMode", () => {
  it("never throws when the write fails", async () => {
    setMaintenance.mockRejectedValue(new Error("db down"));

    await expect(setMaintenanceMode({ enabled: true })).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });

  it("toggles maintenance on success", async () => {
    setMaintenance.mockResolvedValue(undefined);

    const res = await setMaintenanceMode({ enabled: true, title: "점검 중" });

    expect(res).toEqual({});
    expect(setMaintenance).toHaveBeenCalledWith(
      { enabled: true, title: "점검 중", message: undefined },
      "admin-1",
    );
  });
});

describe("clearCache / clearAllAdminSessions", () => {
  it("clearAllAdminSessions never throws on a DB failure", async () => {
    setSetting.mockRejectedValue(new Error("db down"));

    await expect(clearAllAdminSessions()).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });

  it("clearCache logs the action", async () => {
    const res = await clearCache();

    expect(res).toEqual({});
    expect(logAdminActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "cache_clear" }),
    );
  });
});
