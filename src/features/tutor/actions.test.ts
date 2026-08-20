import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * sendTutorMessage() must never throw (except for requireCurrentUser()'s
 * NEXT_REDIRECT control-flow, which must propagate untouched) — every DB/side
 * -effect failure below the auth check has to resolve to a safe
 * {error, code} payload so the client always has something to render. See
 * src/features/tutor/actions.ts's doc comment for the contract this asserts.
 *
 * `vi.mock` factories are hoisted above all top-level code, so the mock
 * objects must be created via `vi.hoisted` rather than as plain consts above
 * the factory (matches src/features/notifications/service.test.ts).
 *
 * "server-only" isn't a real resolvable package outside Next's bundler (it's
 * pulled in transitively via features/tutor/persistence.ts) — stub it like
 * src/features/notifications/service.test.ts does.
 */
vi.mock("server-only", () => ({}));

const { tutorConversation, tutorMessage } = vi.hoisted(() => ({
  tutorConversation: { findFirst: vi.fn(), update: vi.fn() },
  tutorMessage: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { tutorConversation, tutorMessage } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { runTutorTurn } = vi.hoisted(() => ({ runTutorTurn: vi.fn() }));
vi.mock("@/features/tutor/ai", () => ({ runTutorTurn }));

const { bringForwardConceptReviews } = vi.hoisted(() => ({
  bringForwardConceptReviews: vi.fn(),
}));
vi.mock("@/features/review/schedule-service", () => ({ bringForwardConceptReviews }));

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException }));

import { sendTutorMessage } from "@/features/tutor/actions";

const CONVO = {
  id: "convo-1",
  subject: "math",
  grade: "middle",
  messages: [] as { role: string; content: string }[],
};

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue({ id: "user-1" });
  tutorConversation.findFirst.mockResolvedValue(CONVO);
  tutorMessage.create.mockResolvedValue({});
  tutorConversation.update.mockResolvedValue({});
});

describe("sendTutorMessage — happy path", () => {
  it("saves the reply and schedules a review when the AI recommends one", async () => {
    runTutorTurn.mockResolvedValue({
      ok: true,
      reply: {
        reply: "이렇게 풀어봐",
        understanding: "partial",
        reviewRecommendation: { shouldSchedule: true, concept: "분수의 나눗셈" },
      },
    });
    bringForwardConceptReviews.mockResolvedValue(3);

    const res = await sendTutorMessage({ conversationId: "convo-1", content: "질문" });

    expect(res).toEqual({
      reply: { content: "이렇게 풀어봐", understanding: "partial" },
      reviewScheduled: { concept: "분수의 나눗셈", count: 3 },
    });
    expect(tutorMessage.create).toHaveBeenCalledTimes(2);
    expect(tutorMessage.create.mock.calls[1]![0].data.role).toBe("assistant");
  });
});

describe("sendTutorMessage — AI turn rejected (quota/limit)", () => {
  it("returns the guard's error/code/upgradePlan without saving an assistant message", async () => {
    runTutorTurn.mockResolvedValue({
      ok: false,
      error: "사용 한도(10회)를 모두 사용했어요.",
      code: "FEATURE_LIMIT_REACHED",
      upgradePlan: "PRO",
    });

    const res = await sendTutorMessage({ conversationId: "convo-1", content: "질문" });

    expect(res).toEqual({
      error: "사용 한도(10회)를 모두 사용했어요.",
      code: "FEATURE_LIMIT_REACHED",
      upgradePlan: "PRO",
    });
    // Only the student's own message was persisted — no assistant turn was attempted.
    expect(tutorMessage.create).toHaveBeenCalledTimes(1);
  });
});

describe("sendTutorMessage — review scheduling failure is non-fatal", () => {
  it("still saves and returns the reply when bringForwardConceptReviews throws", async () => {
    runTutorTurn.mockResolvedValue({
      ok: true,
      reply: {
        reply: "이렇게 풀어봐",
        reviewRecommendation: { shouldSchedule: true, concept: "분수의 나눗셈" },
      },
    });
    bringForwardConceptReviews.mockRejectedValue(new Error("db down"));

    const res = await sendTutorMessage({ conversationId: "convo-1", content: "질문" });

    expect(res.reply).toEqual({ content: "이렇게 풀어봐", understanding: undefined });
    expect(res.reviewScheduled).toBeUndefined();
    expect(res.error).toBeUndefined();
    expect(tutorMessage.create).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("sendTutorMessage — assistant persistence failure", () => {
  it("returns the reply anyway, flagged persist_failed, instead of throwing", async () => {
    runTutorTurn.mockResolvedValue({ ok: true, reply: { reply: "이렇게 풀어봐" } });
    tutorMessage.create
      .mockResolvedValueOnce({}) // user message succeeds
      .mockRejectedValueOnce(new Error("write failed")); // assistant message fails

    const res = await sendTutorMessage({ conversationId: "convo-1", content: "질문" });

    expect(res).toEqual({
      reply: { content: "이렇게 풀어봐", understanding: undefined },
      reviewScheduled: undefined,
      error: "답변이 저장되지 않았어요. 새로고침하면 사라질 수 있어요.",
      code: "persist_failed",
    });
    expect(tutorConversation.update).not.toHaveBeenCalled();
  });
});

describe("sendTutorMessage — unexpected failure elsewhere", () => {
  it("never throws; resolves to {error, code: 'unexpected'}", async () => {
    tutorConversation.findFirst.mockRejectedValue(new Error("connection refused"));

    const res = await sendTutorMessage({ conversationId: "convo-1", content: "질문" });

    expect(res).toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
      code: "unexpected",
    });
  });
});

describe("sendTutorMessage — auth redirect propagation", () => {
  it("does not swallow requireCurrentUser()'s NEXT_REDIRECT control-flow error", async () => {
    requireCurrentUser.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      sendTutorMessage({ conversationId: "convo-1", content: "질문" }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });
});
