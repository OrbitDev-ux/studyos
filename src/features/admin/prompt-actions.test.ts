import { beforeEach, describe, expect, it, vi } from "vitest";

/** Prompt editing controls what every AI feature actually says to students —
 * flagged in the codebase audit as one of the highest-risk unguarded admin
 * surfaces (alongside bans and IP blocks). */
vi.mock("server-only", () => ({}));

const { prompt, promptVersion, transaction } = vi.hoisted(() => ({
  prompt: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  promptVersion: { create: vi.fn(), findUnique: vi.fn() },
  transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { prompt, promptVersion, $transaction: transaction },
}));

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

const { invalidatePromptCache } = vi.hoisted(() => ({ invalidatePromptCache: vi.fn() }));
vi.mock("@/features/ai/prompt-service", () => ({ invalidatePromptCache }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import {
  createPrompt,
  deletePrompt,
  rollbackPrompt,
  savePromptVersion,
  setPromptEnabled,
} from "@/features/admin/prompt-actions";

const ADMIN = { id: "admin-1", role: "SUPER_ADMIN" };
const VALID_CONTENT = "이것은 20자 이상의 유효한 프롬프트 내용입니다.";

beforeEach(() => {
  vi.clearAllMocks();
  requireCapability.mockResolvedValue(ADMIN);
  getRequestIp.mockResolvedValue("1.2.3.4");
  logAdminActivity.mockResolvedValue(undefined);
});

describe("createPrompt", () => {
  it("rejects content that fails validation before touching the DB", async () => {
    const res = await createPrompt({
      type: "tutor_system",
      title: "T",
      content: "short",
    });

    expect(res.error).toContain("짧습니다");
    expect(prompt.create).not.toHaveBeenCalled();
  });

  it("rejects a duplicate type", async () => {
    prompt.findUnique.mockResolvedValue({ id: "existing" });

    const res = await createPrompt({
      type: "tutor_system",
      title: "T",
      content: VALID_CONTENT,
    });

    expect(res.error).toBe("이미 존재하는 타입입니다.");
    expect(prompt.create).not.toHaveBeenCalled();
  });

  it("never throws when the DB write fails", async () => {
    prompt.findUnique.mockResolvedValue(null);
    prompt.create.mockRejectedValue(new Error("db down"));

    await expect(
      createPrompt({ type: "tutor_system", title: "T", content: VALID_CONTENT }),
    ).resolves.toEqual({ error: "일시적인 오류가 발생했어요. 다시 시도해주세요." });
  });

  it("creates the prompt and invalidates its cache", async () => {
    prompt.findUnique.mockResolvedValue(null);
    prompt.create.mockResolvedValue({ id: "p1" });

    const res = await createPrompt({
      type: "tutor_system",
      title: "T",
      content: VALID_CONTENT,
    });

    expect(res).toEqual({});
    expect(invalidatePromptCache).toHaveBeenCalledWith("tutor_system");
  });
});

describe("savePromptVersion", () => {
  it("404s on a missing prompt", async () => {
    prompt.findUnique.mockResolvedValue(null);

    const res = await savePromptVersion({ promptId: "p1", content: VALID_CONTENT });

    expect(res.error).toBe("프롬프트를 찾을 수 없습니다.");
  });

  it("never throws when the transaction fails", async () => {
    prompt.findUnique.mockResolvedValue({
      id: "p1",
      type: "tutor_system",
      activeVersion: 1,
      versions: [{ version: 1, content: "old" }],
    });
    transaction.mockRejectedValueOnce(new Error("db down"));

    await expect(
      savePromptVersion({ promptId: "p1", content: VALID_CONTENT }),
    ).resolves.toEqual({ error: "일시적인 오류가 발생했어요. 다시 시도해주세요." });
  });
});

describe("rollbackPrompt / setPromptEnabled / deletePrompt", () => {
  it("rollbackPrompt 404s on a missing version", async () => {
    prompt.findUnique.mockResolvedValue({ id: "p1", type: "tutor_system" });
    promptVersion.findUnique.mockResolvedValue(null);

    const res = await rollbackPrompt("p1", 3);

    expect(res.error).toBe("해당 버전을 찾을 수 없습니다.");
    expect(prompt.update).not.toHaveBeenCalled();
  });

  it("setPromptEnabled never throws on a DB failure", async () => {
    prompt.findUnique.mockResolvedValue({ id: "p1", type: "tutor_system" });
    prompt.update.mockRejectedValue(new Error("db down"));

    await expect(setPromptEnabled("p1", false)).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });

  it("deletePrompt removes the prompt and invalidates its cache", async () => {
    prompt.findUnique.mockResolvedValue({ id: "p1", type: "tutor_system" });
    prompt.delete.mockResolvedValue({});

    const res = await deletePrompt("p1");

    expect(res).toEqual({});
    expect(invalidatePromptCache).toHaveBeenCalledWith("tutor_system");
  });
});
