import { describe, expect, it } from "vitest";
import {
  canUseFeature,
  getFeatureLimit,
  getUsageWindow,
  minPlanForFeature,
  shouldShowAds,
} from "@/features/billing/entitlements";

describe("entitlements — limits", () => {
  it("keeps fair-use limits independent of historical plan and trial state", () => {
    for (const state of ["TRIAL", "TRIAL_EXPIRED", "PRO", "PREMIUM"] as const) {
      expect(getFeatureLimit(state, "AI_PROBLEM_GENERATION")).toBe(10);
      expect(getFeatureLimit(state, "MOCK_EXAM_GENERATION")).toBe(2);
      expect(getFeatureLimit(state, "STUDY_BOOK_GENERATION")).toBe(1);
      expect(getUsageWindow(state, "AI_PROBLEM_GENERATION")).toBe("day");
      expect(getUsageWindow(state, "MOCK_EXAM_GENERATION")).toBe("month");
      expect(getUsageWindow(state, "STUDY_BOOK_GENERATION")).toBe("month");
    }
  });

  it("applies the daily problem cap to expired-trial history as well", () => {
    expect(getFeatureLimit("TRIAL_EXPIRED", "AI_PROBLEM_GENERATION")).toBe(10);
    expect(getUsageWindow("TRIAL_EXPIRED", "AI_PROBLEM_GENERATION")).toBe("day");
  });

  it("applies the monthly mock-exam cap to every historical state", () => {
    for (const state of ["TRIAL", "TRIAL_EXPIRED", "PRO", "PREMIUM"] as const) {
      expect(getFeatureLimit(state, "MOCK_EXAM_GENERATION")).toBe(2);
      expect(getUsageWindow(state, "MOCK_EXAM_GENERATION")).toBe("month");
    }
  });

  it("applies the monthly study-book cap to every historical state", () => {
    for (const state of ["TRIAL", "TRIAL_EXPIRED", "PRO", "PREMIUM"] as const) {
      expect(getFeatureLimit(state, "STUDY_BOOK_GENERATION")).toBe(1);
      expect(getUsageWindow(state, "STUDY_BOOK_GENERATION")).toBe("month");
    }
  });
});

describe("entitlements — access", () => {
  it("grants the same learning capabilities to every historical plan state", () => {
    for (const state of ["TRIAL", "TRIAL_EXPIRED", "PRO", "PREMIUM"] as const) {
      for (const feature of [
        "BASIC_ANALYTICS",
        "ADVANCED_ANALYTICS",
        "WEAKNESS_ANALYSIS",
        "WRONG_ANSWER_DNA",
        "SPACED_REPETITION",
        "AI_RECOMMENDATION",
        "ADVANCED_AI_RECOMMENDATION",
        "CUSTOM_THEMES",
      ] as const) {
        expect(canUseFeature(state, feature), `${state}:${feature}`).toBe(true);
      }
    }
    expect(canUseFeature("TRIAL_EXPIRED", "DEV_WORKSPACE")).toBe(false);
  });

  it("allows metered study generation while fair-use capacity remains", () => {
    expect(canUseFeature("TRIAL_EXPIRED", "AI_PROBLEM_GENERATION")).toBe(true);
    expect(canUseFeature("TRIAL_EXPIRED", "MOCK_EXAM_GENERATION")).toBe(true);
    expect(canUseFeature("TRIAL_EXPIRED", "STUDY_BOOK_GENERATION")).toBe(true);
  });
});

describe("entitlements — ads", () => {
  it("never shows ads in the free-only product", () => {
    for (const state of ["TRIAL", "TRIAL_EXPIRED", "PRO", "PREMIUM"] as const) {
      expect(shouldShowAds(state)).toBe(false);
    }
  });

  it("keeps the legacy access-state switch fail-closed for unknown feature keys", () => {
    expect(canUseFeature("TRIAL", "ADS")).toBe(false);
  });
});

describe("entitlements — upgrade mapping", () => {
  it("has no paid plan to recommend for an available learning feature", () => {
    expect(minPlanForFeature("AI_PROBLEM_GENERATION")).toBeNull();
    expect(minPlanForFeature("WRONG_ANSWER_DNA")).toBeNull();
    expect(minPlanForFeature("ADVANCED_ANALYTICS")).toBeNull();
    expect(minPlanForFeature("ADVANCED_AI_RECOMMENDATION")).toBeNull();
  });
});

describe("entitlements — Study OS Dev (DEV_WORKSPACE)", () => {
  it("stays unavailable across historical plan states because its backend is not connected", () => {
    expect(canUseFeature("TRIAL", "DEV_WORKSPACE")).toBe(false);
    expect(canUseFeature("PRO", "DEV_WORKSPACE")).toBe(false);
    expect(canUseFeature("PREMIUM", "DEV_WORKSPACE")).toBe(false);
    expect(canUseFeature("TRIAL_EXPIRED", "DEV_WORKSPACE")).toBe(false);
  });

  it("server-side gate only — never inferred from an unlisted feature key", () => {
    expect(canUseFeature("TRIAL_EXPIRED", "DEV_WORKSPACE")).toBe(false);
    expect(minPlanForFeature("DEV_WORKSPACE")).toBeNull(); // TRIAL (active) already has it
  });
});
