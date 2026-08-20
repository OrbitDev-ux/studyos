import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/session";

/**
 * P0-2: tutor turns must override generateStructured()'s timeout/retry
 * defaults (see the budget math documented next to TUTOR_AI_TIMEOUT_MS /
 * TUTOR_AI_RETRY_ATTEMPTS in config.ts) so a transient AI failure always
 * returns before the /tutor/[conversationId] route's `maxDuration = 60`
 * kills the function. This asserts runTutorTurn() actually passes those
 * overrides through to generateStructured() instead of falling back to its
 * 30s/2-retry defaults.
 *
 * "server-only" isn't a real resolvable package outside Next's bundler (see
 * src/features/notifications/service.test.ts) — every module below that
 * imports it (ai.ts itself, features/billing/access) needs it stubbed.
 */
vi.mock("server-only", () => ({}));

const { generateStructured, generateStreamingText } = vi.hoisted(() => ({
  generateStructured: vi.fn(),
  generateStreamingText: vi.fn(),
}));
vi.mock("@/features/ai/client", () => ({ generateStructured, generateStreamingText }));

const { withGenerationQuota, generationErrorPayload } = vi.hoisted(() => ({
  withGenerationQuota: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
  generationErrorPayload: vi.fn(() => null),
}));
vi.mock("@/features/ai/generation-guard", () => ({
  withGenerationQuota,
  generationErrorPayload,
}));

const { buildTutorContext } = vi.hoisted(() => ({ buildTutorContext: vi.fn() }));
vi.mock("@/features/tutor/context", () => ({ buildTutorContext }));

const { getServerLocale } = vi.hoisted(() => ({ getServerLocale: vi.fn() }));
vi.mock("@/features/i18n/server", () => ({ getServerLocale }));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));

import { runTutorTurn, runTutorTurnStream } from "@/features/tutor/ai";
import { TUTOR_STREAM_SENTINEL } from "@/features/tutor/chat-stream";
import { TUTOR_AI_RETRY_ATTEMPTS, TUTOR_AI_TIMEOUT_MS } from "@/features/tutor/config";

const USER: CurrentUser = {
  id: "user-1",
  name: "학생",
  email: "student@example.com",
  image: null,
  timezone: "Asia/Seoul",
  school: null,
  locale: null,
  plan: "TRIAL",
  subscriptionStatus: "TRIALING",
  trialStartedAt: null,
  trialEndsAt: null,
  adminPlanOverride: null,
  adminPlanOverrideEnabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  withGenerationQuota.mockImplementation((_ctx: unknown, fn: () => unknown) => fn());
  buildTutorContext.mockResolvedValue({
    subject: "수학",
    grade: "중학교",
    weakUnits: [],
    recentWrong: [],
  });
  getServerLocale.mockResolvedValue("ko-KR");
  generateStructured.mockResolvedValue({ reply: "정답은 5야" });
});

describe("runTutorTurn — AI timeout budget (P0-2)", () => {
  it("overrides generateStructured()'s timeoutMs/retryAttempts instead of the 30s/2 defaults", async () => {
    await runTutorTurn(USER, { subject: "math", grade: "middle" }, [], "질문");

    expect(generateStructured).toHaveBeenCalledTimes(1);
    const call = generateStructured.mock.calls[0]![0];
    expect(call.timeoutMs).toBe(TUTOR_AI_TIMEOUT_MS);
    expect(call.retryAttempts).toBe(TUTOR_AI_RETRY_ATTEMPTS);

    // Sanity: the overrides must actually be tighter than generateStructured()'s
    // own defaults — otherwise this test would pass without the budget fix.
    expect(TUTOR_AI_TIMEOUT_MS).toBeLessThan(30_000);
    expect(TUTOR_AI_RETRY_ATTEMPTS).toBeLessThan(2);
  });
});

describe("runTutorTurnStream — P0-3 streaming turn", () => {
  it("forwards only the visible reply to onChunk, even when the sentinel is split across chunks", async () => {
    generateStreamingText.mockImplementation(async function* () {
      yield "안녕";
      yield "하세요";
      // Split the sentinel itself across two chunks — the boundary check must
      // work against the full accumulated text, not any single chunk.
      yield TUTOR_STREAM_SENTINEL.slice(0, 3);
      yield TUTOR_STREAM_SENTINEL.slice(3);
      yield '{"understanding":"understood"}';
    });

    const chunks: string[] = [];
    const res = await runTutorTurnStream(
      USER,
      { subject: "math", grade: "middle" },
      [],
      "질문",
      (chunk) => chunks.push(chunk),
    );

    expect(chunks.join("")).toBe("안녕하세요");
    expect(res).toEqual({
      ok: true,
      reply: { reply: "안녕하세요", understanding: "understood" },
    });
  });

  it("flushes the withheld tail when the sentinel never appears at all", async () => {
    generateStreamingText.mockImplementation(async function* () {
      yield "정답은 5";
      yield "야"; // no sentinel anywhere — the whole thing is the reply
    });

    const chunks: string[] = [];
    const res = await runTutorTurnStream(
      USER,
      { subject: "math", grade: "middle" },
      [],
      "질문",
      (chunk) => chunks.push(chunk),
    );

    expect(chunks.join("")).toBe("정답은 5야");
    expect(res).toEqual({ ok: true, reply: { reply: "정답은 5야" } });
  });

  it("also overrides the timeout budget for the streaming call", async () => {
    generateStreamingText.mockImplementation(async function* () {
      yield "ok";
    });

    await runTutorTurnStream(
      USER,
      { subject: "math", grade: "middle" },
      [],
      "질문",
      () => {},
    );

    expect(generateStreamingText).toHaveBeenCalledTimes(1);
    expect(generateStreamingText.mock.calls[0]![0].timeoutMs).toBe(TUTOR_AI_TIMEOUT_MS);
  });

  it("classifies a failure the same way as the non-streaming turn", async () => {
    generateStreamingText.mockImplementation(() => {
      throw new Error("network drop");
    });

    const res = await runTutorTurnStream(
      USER,
      { subject: "math", grade: "middle" },
      [],
      "질문",
      () => {},
    );

    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toBe(
      "선생님이 잠시 자리를 비웠어요. 잠시 후 다시 시도해주세요.",
    );
  });
});
