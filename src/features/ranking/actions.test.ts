import { beforeEach, describe, expect, it, vi } from "vitest";

/** updateSchool previously used z.parse() (throws on invalid input) and
 * unhandled Supabase errors — both crashed the form silently. Keep the same
 * safety tests against the Prisma version: no write for empty input, and a
 * generic error message (never the raw DB error) when the update fails. */
const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { prisma } = vi.hoisted(() => ({
  prisma: { user: { update: vi.fn() } },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { updateSchool } from "@/features/ranking/actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue({ id: "user-1" });
});

describe("updateSchool", () => {
  it("rejects an empty school name without touching the DB", async () => {
    const res = await updateSchool("");

    expect(res.error).toBeTruthy();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns a safe error instead of throwing when the DB update fails", async () => {
    prisma.user.update.mockRejectedValue(new Error("connection refused"));

    await expect(updateSchool("서울고등학교")).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });

  it("updates the school on success", async () => {
    prisma.user.update.mockResolvedValue({ id: "user-1", school: "서울고등학교" });

    await expect(updateSchool("서울고등학교")).resolves.toEqual({});
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { school: "서울고등학교" },
    });
  });
});