import { beforeEach, describe, expect, it, vi } from "vitest";

/** updateSchool previously used z.parse() (throws on invalid input) and
 * `if (error) throw error` for the Supabase failure — both unhandled by its
 * only caller (SchoolSettingsForm), so either one crashed the form silently. */
const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { update } = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => ({ update: () => ({ eq: update }) }),
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { updateSchool } from "@/features/ranking/actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue({ id: "user-1" });
});

describe("updateSchool", () => {
  it("rejects an empty school name without calling Supabase", async () => {
    const res = await updateSchool("");

    expect(res.error).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns a safe error instead of throwing when Supabase fails", async () => {
    update.mockResolvedValue({ error: { message: "connection refused" } });

    await expect(updateSchool("서울고등학교")).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });

  it("updates the school on success", async () => {
    update.mockResolvedValue({ error: null });

    await expect(updateSchool("서울고등학교")).resolves.toEqual({});
  });
});
