import { beforeEach, describe, expect, it, vi } from "vitest";

/** updateAiSettings is the AI kill-switch — flagged in the codebase audit
 * as a highest-risk unguarded surface. */
vi.mock("server-only", () => ({}));

const { requireCapability } = vi.hoisted(() => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/admin/context", () => ({ requireCapability }));

const { getSetting, setSetting } = vi.hoisted(() => ({
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));
vi.mock("@/lib/admin/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/settings")>();
  return { ...actual, getSetting, setSetting };
});

const { logAdminActivity } = vi.hoisted(() => ({ logAdminActivity: vi.fn() }));
vi.mock("@/lib/admin/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/activity")>();
  return { ...actual, logAdminActivity };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { updateAiSettings } from "@/features/admin/ai-actions";

const ADMIN = { id: "admin-1", role: "SUPER_ADMIN" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCapability.mockResolvedValue(ADMIN);
  logAdminActivity.mockResolvedValue(undefined);
  setSetting.mockResolvedValue(undefined);
});

describe("updateAiSettings", () => {
  it("logs an AI_TOGGLE event only when the enabled flag actually changes", async () => {
    getSetting.mockResolvedValue(true);

    await updateAiSettings({ enabled: true, model: "gemini-3.6-flash" });

    const actions = logAdminActivity.mock.calls.map((c) => c[0].action);
    expect(actions).not.toContain("ai_toggle");
    expect(actions).toContain("ai_settings_update");
  });

  it("logs an AI_TOGGLE event when the enabled flag flips", async () => {
    getSetting.mockResolvedValue(true);

    await updateAiSettings({ enabled: false, model: "gemini-3.6-flash" });

    const actions = logAdminActivity.mock.calls.map((c) => c[0].action);
    expect(actions).toContain("ai_toggle");
  });

  it("never throws when the setting write fails", async () => {
    getSetting.mockResolvedValue(true);
    setSetting.mockRejectedValue(new Error("db down"));

    await expect(
      updateAiSettings({ enabled: false, model: "gemini-3.6-flash" }),
    ).resolves.toEqual({ error: "일시적인 오류가 발생했어요. 다시 시도해주세요." });
  });
});
