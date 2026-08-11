import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AiGenerationError,
  aiErrorResult,
  classifyAiError,
} from "@/features/ai/errors";

// Reproduces the reported failure: Gemini free-tier 429 ("분석/해설 생성 실패").
// The raw 429 body includes billing text that must never reach the user/logs.
const gemini429 = Object.assign(new Error(
  'got status: 429. {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details."}}',
), { status: 429 });

describe("classifyAiError", () => {
  it("maps a 429 (rate limit) to a safe 'rate' message without the raw billing text", () => {
    const e = classifyAiError(gemini429);
    expect(e).toBeInstanceOf(AiGenerationError);
    expect(e.code).toBe("rate");
    expect(e.message).toContain("잠시 후");
    expect(e.message).not.toMatch(/billing|quota|plan/i);
  });

  it("matches RESOURCE_EXHAUSTED text even without a numeric status", () => {
    expect(classifyAiError(new Error("RESOURCE_EXHAUSTED: rate limit")).code).toBe("rate");
  });

  it("maps 503/overloaded to 'unavailable'", () => {
    expect(classifyAiError(Object.assign(new Error("x"), { status: 503 })).code).toBe(
      "unavailable",
    );
    expect(classifyAiError(new Error("model is overloaded")).code).toBe("unavailable");
  });

  it("maps an invalid/disabled API key or account to 'auth' (permanent, not transient)", () => {
    // The real failure observed in prod: 401 with an ACCOUNT_STATE_INVALID body.
    const e = classifyAiError(
      Object.assign(
        new Error(
          '{"error":{"code":401,"message":"The bound service account is deleted or disabled.","status":"UNAUTHENTICATED","reason":"ACCOUNT_STATE_INVALID"}}',
        ),
        { status: 401 },
      ),
    );
    expect(e.code).toBe("auth");
    expect(e.message).not.toMatch(/잠시 후/); // must not read as retryable
    expect(classifyAiError(new Error("API key not valid")).code).toBe("auth");
    expect(classifyAiError(Object.assign(new Error("x"), { status: 403 })).code).toBe("auth");
  });

  it("falls back to 'failed' for unknown errors", () => {
    expect(classifyAiError(new Error("something else")).code).toBe("failed");
  });

  it("returns an existing AiGenerationError unchanged", () => {
    const original = new AiGenerationError("disabled", "off");
    expect(classifyAiError(original)).toBe(original);
  });
});

describe("aiErrorResult", () => {
  it("returns a client-safe payload for AiGenerationError", () => {
    expect(aiErrorResult(new AiGenerationError("rate", "많아요"))).toEqual({
      error: "많아요",
      code: "rate",
    });
  });

  it("surfaces a schema (Zod) parse failure as a safe message", () => {
    const zodErr = z.object({ a: z.string() }).safeParse({ a: 1 }).error;
    const res = aiErrorResult(zodErr);
    expect(res?.code).toBe("failed");
    expect(res?.error).toContain("형식");
  });

  it("returns null for non-AI errors so the caller rethrows (e.g. redirects)", () => {
    expect(aiErrorResult(new Error("NEXT_REDIRECT"))).toBeNull();
  });
});
