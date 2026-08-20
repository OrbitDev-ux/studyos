import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireCapability } = vi.hoisted(() => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/admin/context", () => ({ requireCapability }));

const { getLabFeature } = vi.hoisted(() => ({ getLabFeature: vi.fn() }));
vi.mock("@/features/lab/registry", () => ({ getLabFeature }));

const { setLabFeatureEnabled } = vi.hoisted(() => ({ setLabFeatureEnabled: vi.fn() }));
vi.mock("@/features/lab/state", () => ({ setLabFeatureEnabled }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { toggleLabFeature } from "@/features/lab/admin-actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireCapability.mockResolvedValue({ id: "admin-1" });
});

describe("toggleLabFeature", () => {
  it("rejects an unknown feature key without writing", async () => {
    getLabFeature.mockReturnValue(undefined);

    const res = await toggleLabFeature("nonexistent", true);

    expect(res.error).toBe("존재하지 않는 실험 기능입니다.");
    expect(setLabFeatureEnabled).not.toHaveBeenCalled();
  });

  it("returns a safe error instead of throwing when the DB write fails", async () => {
    getLabFeature.mockReturnValue({ key: "foo" });
    setLabFeatureEnabled.mockRejectedValue(new Error("db down"));

    await expect(toggleLabFeature("foo", true)).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });

  it("toggles the feature on success", async () => {
    getLabFeature.mockReturnValue({ key: "foo" });
    setLabFeatureEnabled.mockResolvedValue(undefined);

    await expect(toggleLabFeature("foo", true)).resolves.toEqual({ ok: true });
  });
});
