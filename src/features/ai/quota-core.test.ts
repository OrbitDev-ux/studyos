import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_QUOTA_POLICY,
  coercePolicy,
  isGuestEmail,
  tierForEmail,
} from "@/features/ai/quota-core";

const ORIGINAL = process.env.AI_TESTER_EMAILS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.AI_TESTER_EMAILS;
  else process.env.AI_TESTER_EMAILS = ORIGINAL;
});

describe("quota core", () => {
  it("detects guest emails (case/whitespace-insensitive)", () => {
    expect(isGuestEmail("guest_abc@guest.studyos.app")).toBe(true);
    expect(isGuestEmail("  GUEST_abc@GUEST.studyos.app ")).toBe(true);
    expect(isGuestEmail("real@example.com")).toBe(false);
  });

  it("classifies guest vs user by email", () => {
    expect(tierForEmail("guest_x@guest.studyos.app")).toBe("guest");
    expect(tierForEmail("student@example.com")).toBe("user");
  });

  it("classifies testers only when in the env allowlist", () => {
    process.env.AI_TESTER_EMAILS = "tester@example.com, second@team.io";
    expect(tierForEmail("tester@example.com")).toBe("tester");
    expect(tierForEmail("SECOND@team.io")).toBe("tester"); // normalized
    expect(tierForEmail("other@example.com")).toBe("user");
  });

  it("default policy matches the spec tiers", () => {
    expect(DEFAULT_QUOTA_POLICY.guest).toEqual({ daily: 5, perMinute: 1, concurrent: 1 });
    expect(DEFAULT_QUOTA_POLICY.user).toEqual({ daily: 20, perMinute: 3, concurrent: 1 });
    // Testers get a higher-but-finite budget (no unlimited tier).
    expect(DEFAULT_QUOTA_POLICY.tester.daily).toBeGreaterThan(
      DEFAULT_QUOTA_POLICY.user.daily,
    );
    expect(Number.isFinite(DEFAULT_QUOTA_POLICY.tester.daily)).toBe(true);
  });

  it("coercePolicy falls back to default for null/invalid, accepts valid", () => {
    expect(coercePolicy(null)).toBe(DEFAULT_QUOTA_POLICY);
    expect(coercePolicy({ garbage: true })).toBe(DEFAULT_QUOTA_POLICY);

    const custom = {
      guest: { daily: 3, perMinute: 1, concurrent: 1 },
      user: { daily: 50, perMinute: 5, concurrent: 1 },
      tester: { daily: 500, perMinute: 20, concurrent: 3 },
    };
    expect(coercePolicy(custom)).toEqual(custom);
  });
});
