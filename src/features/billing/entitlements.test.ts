import { describe, expect, it } from "vitest";
import {
  canUseFeature,
  getFeatureLimit,
  getUsageWindow,
  minPlanForFeature,
  shouldShowAds,
} from "@/features/billing/entitlements";

describe("entitlements — limits", () => {
  it("AI problem generation limits per state", () => {
    expect(getFeatureLimit("TRIAL", "AI_PROBLEM_GENERATION")).toBe(10);
    expect(getFeatureLimit("PRO", "AI_PROBLEM_GENERATION")).toBe(50);
    expect(getFeatureLimit("PREMIUM", "AI_PROBLEM_GENERATION")).toBeNull(); // unlimited
    expect(getFeatureLimit("TRIAL_EXPIRED", "AI_PROBLEM_GENERATION")).toBe(0);
  });

  it("mock exam limits per state", () => {
    expect(getFeatureLimit("TRIAL", "MOCK_EXAM_GENERATION")).toBe(2);
    expect(getFeatureLimit("PRO", "MOCK_EXAM_GENERATION")).toBe(10);
    expect(getFeatureLimit("PREMIUM", "MOCK_EXAM_GENERATION")).toBeNull();
  });

  it("mock exam usage window depends on state", () => {
    expect(getUsageWindow("TRIAL", "MOCK_EXAM_GENERATION")).toBe("trial");
    expect(getUsageWindow("PRO", "MOCK_EXAM_GENERATION")).toBe("month");
    expect(getUsageWindow("PREMIUM", "MOCK_EXAM_GENERATION")).toBe("unlimited");
    expect(getUsageWindow("TRIAL", "AI_PROBLEM_GENERATION")).toBe("day");
  });

  it("study book limits + window per state", () => {
    expect(getFeatureLimit("TRIAL", "STUDY_BOOK_GENERATION")).toBe(1);
    expect(getFeatureLimit("PRO", "STUDY_BOOK_GENERATION")).toBe(5);
    expect(getFeatureLimit("PREMIUM", "STUDY_BOOK_GENERATION")).toBeNull();
    expect(getFeatureLimit("TRIAL_EXPIRED", "STUDY_BOOK_GENERATION")).toBe(0);
    expect(getUsageWindow("TRIAL", "STUDY_BOOK_GENERATION")).toBe("trial");
    expect(getUsageWindow("PRO", "STUDY_BOOK_GENERATION")).toBe("month");
    expect(getUsageWindow("PREMIUM", "STUDY_BOOK_GENERATION")).toBe("unlimited");
  });
});

describe("entitlements — access", () => {
  it("TRIAL: basic features yes, advanced/DNA no, AI recommendation (basic) yes", () => {
    expect(canUseFeature("TRIAL", "BASIC_ANALYTICS")).toBe(true);
    expect(canUseFeature("TRIAL", "SPACED_REPETITION")).toBe(true);
    expect(canUseFeature("TRIAL", "AI_RECOMMENDATION")).toBe(true);
    expect(canUseFeature("TRIAL", "ADVANCED_ANALYTICS")).toBe(false);
    expect(canUseFeature("TRIAL", "WRONG_ANSWER_DNA")).toBe(false);
    expect(canUseFeature("TRIAL", "ADVANCED_AI_RECOMMENDATION")).toBe(false);
  });

  it("PRO unlocks advanced analytics + DNA, not advanced AI recommendation", () => {
    expect(canUseFeature("PRO", "ADVANCED_ANALYTICS")).toBe(true);
    expect(canUseFeature("PRO", "WRONG_ANSWER_DNA")).toBe(true);
    expect(canUseFeature("PRO", "AI_RECOMMENDATION")).toBe(true);
    expect(canUseFeature("PRO", "ADVANCED_AI_RECOMMENDATION")).toBe(false);
  });

  it("PREMIUM unlocks everything incl. advanced AI recommendation + custom themes", () => {
    expect(canUseFeature("PREMIUM", "ADVANCED_AI_RECOMMENDATION")).toBe(true);
    expect(canUseFeature("PREMIUM", "CUSTOM_THEMES")).toBe(true);
  });

  it("expired trial blocks generation", () => {
    expect(canUseFeature("TRIAL_EXPIRED", "AI_PROBLEM_GENERATION")).toBe(false);
    expect(canUseFeature("TRIAL_EXPIRED", "MOCK_EXAM_GENERATION")).toBe(false);
  });
});

describe("entitlements — ads", () => {
  it("only TRIAL-active shows ads", () => {
    expect(shouldShowAds("TRIAL")).toBe(true);
    expect(shouldShowAds("TRIAL_EXPIRED")).toBe(false);
    expect(shouldShowAds("PRO")).toBe(false);
    expect(shouldShowAds("PREMIUM")).toBe(false);
  });
});

describe("entitlements — upgrade mapping", () => {
  it("min plan that unlocks a feature", () => {
    expect(minPlanForFeature("AI_PROBLEM_GENERATION")).toBeNull(); // TRIAL has it
    expect(minPlanForFeature("WRONG_ANSWER_DNA")).toBe("PRO");
    expect(minPlanForFeature("ADVANCED_ANALYTICS")).toBe("PRO");
    expect(minPlanForFeature("ADVANCED_AI_RECOMMENDATION")).toBe("PREMIUM");
  });
});
