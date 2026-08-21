import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * isAdSenseConfigured's regex validation is the final gate on whether a real
 * AdSense request is ever sent to the browser (vs. a harmless placeholder) —
 * flagged in the codebase audit as untested despite that. The env vars it
 * reads are captured into module-level consts at import time, so each case
 * resets modules and re-imports after setting process.env, rather than
 * changing the source to read env lazily just to make this easier to test.
 */

const ENV_KEYS = [
  "NEXT_PUBLIC_ADSENSE_CLIENT_ID",
  "NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT",
  "NEXT_PUBLIC_ADSENSE_RESULT_SLOT",
  "NEXT_PUBLIC_ADSENSE_MOCK_EXAM_SLOT",
  "NEXT_PUBLIC_ADSENSE_REVIEW_SLOT",
] as const;

const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  vi.resetModules();
});

async function loadWith(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  vi.resetModules();
  return import("@/features/ads/config");
}

describe("isAdSenseConfigured", () => {
  it("is false when no env vars are set at all (local dev)", async () => {
    const { isAdSenseConfigured } = await loadWith({});
    expect(isAdSenseConfigured("dashboard")).toBe(false);
  });

  it("is true when both the client id and this placement's slot are valid", async () => {
    const { isAdSenseConfigured } = await loadWith({
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456",
      NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT: "1122334455",
    });
    expect(isAdSenseConfigured("dashboard")).toBe(true);
  });

  it("is false for a placement whose own slot env var isn't set, even with a valid client id", async () => {
    const { isAdSenseConfigured } = await loadWith({
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456",
      NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT: "1122334455",
    });
    expect(isAdSenseConfigured("review")).toBe(false);
  });

  it("is false when the client id doesn't match the expected ca-pub-<digits> shape", async () => {
    const { isAdSenseConfigured } = await loadWith({
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: "not-a-real-client-id",
      NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT: "1122334455",
    });
    expect(isAdSenseConfigured("dashboard")).toBe(false);
  });

  it("is false when the slot contains non-digit characters (malformed/placeholder env)", async () => {
    const { isAdSenseConfigured } = await loadWith({
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456",
      NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT: "your-slot-here",
    });
    expect(isAdSenseConfigured("dashboard")).toBe(false);
  });
});
