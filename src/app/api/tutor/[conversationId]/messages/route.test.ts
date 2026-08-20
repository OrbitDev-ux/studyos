import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * POST /api/tutor/[conversationId]/messages is the P0-3 streaming turn — the
 * least-precedented file in this change (no other Route Handler in this repo
 * is unit-tested). Covers the plain-JSON early-return paths (auth/origin/
 * validation/404) directly, plus a smoke test that the NDJSON stream actually
 * carries chunk/done and chunk/error events in the right shape. Does NOT
 * cover: real network behavior, client-disconnect mid-stream, or the actual
 * AI provider — those need manual/browser verification (AGENTS.md §17).
 */
const { getCurrentUserOrNull } = vi.hoisted(() => ({ getCurrentUserOrNull: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentUserOrNull }));

const {
  loadConversationForTurn,
  persistUserMessage,
  persistAssistantReply,
  scheduleReviewIfRecommended,
} = vi.hoisted(() => ({
  loadConversationForTurn: vi.fn(),
  persistUserMessage: vi.fn(),
  persistAssistantReply: vi.fn(),
  scheduleReviewIfRecommended: vi.fn(),
}));
vi.mock("@/features/tutor/persistence", () => ({
  loadConversationForTurn,
  persistUserMessage,
  persistAssistantReply,
  scheduleReviewIfRecommended,
}));

const { runTutorTurnStream } = vi.hoisted(() => ({ runTutorTurnStream: vi.fn() }));
vi.mock("@/features/tutor/ai", () => ({ runTutorTurnStream }));

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException }));

import { POST } from "./route";

const URL = "https://studyos.example.com/api/tutor/convo-1/messages";
const USER = { id: "user-1" };
const CONVO = { id: "convo-1", subject: "math", grade: "middle", history: [] };
const PARAMS = { params: Promise.resolve({ conversationId: "convo-1" }) };

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** Reads every NDJSON line from a Response's body. */
async function readEvents(res: Response): Promise<unknown[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserOrNull.mockResolvedValue(USER);
  loadConversationForTurn.mockResolvedValue(CONVO);
  persistUserMessage.mockResolvedValue({});
  scheduleReviewIfRecommended.mockResolvedValue(undefined);
  persistAssistantReply.mockResolvedValue({ ok: true });
});

describe("POST /api/tutor/[conversationId]/messages — early returns", () => {
  it("403s on a cross-origin request", async () => {
    const res = await POST(
      postRequest({ content: "질문" }, { origin: "https://evil.example.com" }),
      PARAMS,
    );
    expect(res.status).toBe(403);
    expect(getCurrentUserOrNull).not.toHaveBeenCalled();
  });

  it("401s when there is no authenticated user", async () => {
    getCurrentUserOrNull.mockResolvedValue(null);
    const res = await POST(postRequest({ content: "질문" }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("400s on an invalid body", async () => {
    const res = await POST(postRequest({ content: "" }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("404s when the conversation doesn't exist (or isn't owned by the user)", async () => {
    loadConversationForTurn.mockResolvedValue(null);
    const res = await POST(postRequest({ content: "질문" }), PARAMS);
    expect(res.status).toBe(404);
    expect(persistUserMessage).not.toHaveBeenCalled();
  });
});

describe("POST /api/tutor/[conversationId]/messages — streaming body", () => {
  it("streams chunk events then a done event on success", async () => {
    runTutorTurnStream.mockImplementation(
      async (_user, _convo, _history, _content, onChunk) => {
        onChunk("안녕");
        onChunk("하세요");
        return { ok: true, reply: { reply: "안녕하세요", understanding: "understood" } };
      },
    );

    const res = await POST(postRequest({ content: "질문" }), PARAMS);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");

    const events = await readEvents(res);
    expect(events).toEqual([
      { type: "chunk", text: "안녕" },
      { type: "chunk", text: "하세요" },
      { type: "done", reviewScheduled: undefined, understanding: "understood" },
    ]);
    expect(persistAssistantReply).toHaveBeenCalledWith(
      "convo-1",
      { reply: "안녕하세요", understanding: "understood" },
      undefined,
    );
  });

  it("streams an error event when the AI turn is rejected (quota/limit)", async () => {
    runTutorTurnStream.mockResolvedValue({
      ok: false,
      error: "사용 한도를 모두 사용했어요.",
      code: "FEATURE_LIMIT_REACHED",
      upgradePlan: "PRO",
    });

    const res = await POST(postRequest({ content: "질문" }), PARAMS);
    const events = await readEvents(res);
    expect(events).toEqual([
      {
        type: "error",
        error: "사용 한도를 모두 사용했어요.",
        code: "FEATURE_LIMIT_REACHED",
        upgradePlan: "PRO",
      },
    ]);
    expect(persistAssistantReply).not.toHaveBeenCalled();
  });

  it("streams a persist_failed error after a successful turn if saving fails", async () => {
    runTutorTurnStream.mockResolvedValue({ ok: true, reply: { reply: "이렇게 풀어봐" } });
    persistAssistantReply.mockResolvedValue({
      ok: false,
      error: "답변이 저장되지 않았어요. 새로고침하면 사라질 수 있어요.",
      code: "persist_failed",
    });

    const res = await POST(postRequest({ content: "질문" }), PARAMS);
    const events = await readEvents(res);
    expect(events).toEqual([
      {
        type: "error",
        error: "답변이 저장되지 않았어요. 새로고침하면 사라질 수 있어요.",
        code: "persist_failed",
      },
    ]);
  });

  it("never lets an unexpected throw escape without an error event", async () => {
    runTutorTurnStream.mockRejectedValue(new Error("boom"));

    const res = await POST(postRequest({ content: "질문" }), PARAMS);
    const events = await readEvents(res);
    expect(events).toEqual([
      {
        type: "error",
        error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
        code: "unexpected",
      },
    ]);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
