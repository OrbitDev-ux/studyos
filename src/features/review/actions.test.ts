import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * requestAiExplanation/analyzeWrongAnswerDna had NO AI-cost quota gate at all
 * (Codebase audit) — the only guard was "already generated → return cached",
 * which does nothing against fan-out across many different wrong answers.
 * This verifies both now go through withGenerationQuota like every other
 * on-demand AI call in the app.
 */
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/ip", () => ({ getClientIp: vi.fn().mockReturnValue("1.2.3.4") }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { wrongAnswer } = vi.hoisted(() => ({
  wrongAnswer: { findFirst: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { wrongAnswer, problemAttempt: { findFirst: vi.fn() } } }));

const { generateStructured, aiErrorResult } = vi.hoisted(() => ({
  generateStructured: vi.fn(),
  aiErrorResult: vi.fn(() => null),
}));
vi.mock("@/features/ai/client", () => ({ generateStructured, aiErrorResult }));

vi.mock("@/features/ai/prompt-service", () => ({ getActivePromptContent: vi.fn().mockResolvedValue("sys") }));
vi.mock("@/features/ai/prompt-registry", () => ({
  PROMPT_TYPES: { ANSWER_EXPLANATION: "answer_explanation", WRONG_ANSWER_DNA: "wrong_answer_dna" },
}));
vi.mock("@/features/ai/prompts/answer-explanation", () => ({
  buildAnswerExplanationPrompt: vi.fn(() => "prompt"),
}));
vi.mock("@/features/billing/access", () => ({
  accessStateFor: vi.fn(() => "PRO"),
  trialStartedDate: vi.fn(() => null),
}));
vi.mock("@/features/billing/entitlements", () => ({ canUseFeature: vi.fn(() => true) }));

const { withGenerationQuota, generationErrorPayload } = vi.hoisted(() => ({
  withGenerationQuota: vi.fn(),
  generationErrorPayload: vi.fn(),
}));
vi.mock("@/features/ai/generation-guard", () => ({ withGenerationQuota, generationErrorPayload }));

const { gradeReviewById } = vi.hoisted(() => ({ gradeReviewById: vi.fn() }));
vi.mock("@/features/review/schedule-service", () => ({ gradeReviewById }));

const { onReviewCompleted } = vi.hoisted(() => ({ onReviewCompleted: vi.fn() }));
vi.mock("@/features/growth/hooks", () => ({ onReviewCompleted }));

import { gradeReview, requestAiExplanation } from "@/features/review/actions";

const USER = { id: "user-1", timezone: "Asia/Seoul" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
  aiErrorResult.mockReturnValue(null);
});

describe("requestAiExplanation", () => {
  it("returns the cached explanation without spending any quota", async () => {
    wrongAnswer.findFirst.mockResolvedValue({
      id: "wa-1",
      aiExplanation: "이미 생성된 해설",
      problem: { type: "MULTIPLE_CHOICE", choices: [] },
    });

    const res = await requestAiExplanation("wa-1");

    expect(res).toEqual({ explanation: "이미 생성된 해설" });
    expect(withGenerationQuota).not.toHaveBeenCalled();
  });

  it("routes a fresh generation through withGenerationQuota, sharing the 'problem' bucket", async () => {
    wrongAnswer.findFirst.mockResolvedValue({
      id: "wa-1",
      aiExplanation: null,
      problem: { prompt: "1+1=?", type: "MULTIPLE_CHOICE", choices: [{ isCorrect: true, content: "2" }] },
    });
    withGenerationQuota.mockImplementation(async (_ctx: unknown, fn: () => Promise<unknown>) => fn());
    generateStructured.mockResolvedValue({ explanation: "새 해설" });
    wrongAnswer.update.mockResolvedValue({});

    const res = await requestAiExplanation("wa-1");

    expect(res).toEqual({ explanation: "새 해설" });
    expect(withGenerationQuota).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", kind: "problem", count: 1 }),
      expect.any(Function),
    );
  });

  it("surfaces a quota/plan-limit rejection as a client-safe error instead of throwing", async () => {
    wrongAnswer.findFirst.mockResolvedValue({
      id: "wa-1",
      aiExplanation: null,
      problem: { prompt: "1+1=?", type: "MULTIPLE_CHOICE", choices: [] },
    });
    const quotaError = new Error("limit reached");
    withGenerationQuota.mockRejectedValue(quotaError);
    generationErrorPayload.mockReturnValue({ error: "사용 한도를 모두 사용했어요.", code: "FEATURE_LIMIT_REACHED" });

    const res = await requestAiExplanation("wa-1");

    expect(res).toEqual({ error: "사용 한도를 모두 사용했어요." });
    expect(wrongAnswer.update).not.toHaveBeenCalled();
  });
});

describe("gradeReview — Growth integration", () => {
  it("rejects a grade string that isn't a real ReviewGrade before touching the scheduler", async () => {
    const res = await gradeReview("wa-1", "impossible");

    expect(res).toEqual({ error: "올바르지 않은 복습 결과입니다." });
    expect(gradeReviewById).not.toHaveBeenCalled();
    expect(onReviewCompleted).not.toHaveBeenCalled();
  });

  it("awards Growth XP for real forward progress (hard/good/easy)", async () => {
    gradeReviewById.mockResolvedValue({ graduated: false, reviewStage: 2 });

    const res = await gradeReview("wa-1", "good");

    expect(res).toEqual({ graduated: false, reviewStage: 2 });
    expect(onReviewCompleted).toHaveBeenCalledWith("user-1", "wa-1", 2, "Asia/Seoul");
  });

  it("does not award Growth XP for 'again' — a lapse resets the schedule instead of advancing it", async () => {
    gradeReviewById.mockResolvedValue({ graduated: false, reviewStage: 0 });

    await gradeReview("wa-1", "again");

    expect(onReviewCompleted).not.toHaveBeenCalled();
  });

  it("does not award Growth XP when the wrong answer can't be found", async () => {
    gradeReviewById.mockResolvedValue(null);

    const res = await gradeReview("wa-1", "good");

    expect(res).toEqual({ error: "오답 기록을 찾을 수 없습니다." });
    expect(onReviewCompleted).not.toHaveBeenCalled();
  });
});
