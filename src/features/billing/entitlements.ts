import type { Plan } from "@/features/billing/plans";
import { PLANS, PLAN_META } from "@/features/billing/plans";
import type { AccessState } from "@/features/billing/subscription";

/**
 * Central entitlement policy — the ONE place access/limits live, keyed by the
 * resolved AccessState (TRIAL / TRIAL_EXPIRED / PRO / PREMIUM). Pure (no DB/IO):
 * unit-testable and safe on client & server. Feature code must call these
 * helpers instead of comparing `plan` inline. A future billing layer only ever
 * changes User.plan/status; all gating flows from here automatically.
 *
 * TRIAL_EXPIRED keeps read access to existing learning data (those surfaces are
 * not gated here) but blocks generation and hides ads — the upgrade screen takes
 * over.
 */

/** Canonical feature keys — never write these strings ad hoc elsewhere. */
export const FEATURES = {
  AI_PROBLEM_GENERATION: "AI_PROBLEM_GENERATION",
  MOCK_EXAM_GENERATION: "MOCK_EXAM_GENERATION",
  STUDY_BOOK_GENERATION: "STUDY_BOOK_GENERATION",
  BASIC_ANALYTICS: "BASIC_ANALYTICS",
  ADVANCED_ANALYTICS: "ADVANCED_ANALYTICS",
  WEAKNESS_ANALYSIS: "WEAKNESS_ANALYSIS",
  WRONG_ANSWER_DNA: "WRONG_ANSWER_DNA",
  SPACED_REPETITION: "SPACED_REPETITION",
  AI_RECOMMENDATION: "AI_RECOMMENDATION",
  ADVANCED_AI_RECOMMENDATION: "ADVANCED_AI_RECOMMENDATION",
  CUSTOM_THEMES: "CUSTOM_THEMES",
  ADS: "ADS",
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

/** Usage-metered features. */
export const METERED_FEATURES = [
  "AI_PROBLEM_GENERATION",
  "MOCK_EXAM_GENERATION",
  "STUDY_BOOK_GENERATION",
] as const;
export type MeteredFeature = (typeof METERED_FEATURES)[number];

/** The window a metered limit resets over. "trial" = whole trial period. */
export type UsageWindow = "day" | "month" | "trial" | "unlimited";

/** null = unlimited (no numeric cap; abuse still limited by the server guard). */
export type Limit = number | null;

/** Graded capability level for tiered features. */
export type Tier = "none" | "basic" | "detailed" | "advanced";
const TIER_ORDER: Record<Tier, number> = { none: 0, basic: 1, detailed: 2, advanced: 3 };
export function tierAtLeast(tier: Tier, min: Tier): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER[min];
}

export type ThemeAccess = "none" | "some" | "all";

type Entitlement = {
  limits: Record<MeteredFeature, Limit>;
  basicAnalytics: boolean;
  advancedAnalytics: boolean;
  /** Weakness depth; basic numbers are always shown, this gates the deep view. */
  weakness: Tier;
  wrongAnswerDna: boolean;
  spacedRepetition: boolean;
  /** AI learning recommendation depth. */
  recommendation: Tier;
  advancedRecommendation: boolean;
  customThemes: ThemeAccess;
  ads: boolean;
};

export const ACCESS_ENTITLEMENTS: Record<AccessState, Entitlement> = {
  TRIAL: {
    limits: { AI_PROBLEM_GENERATION: 10, MOCK_EXAM_GENERATION: 2, STUDY_BOOK_GENERATION: 1 },
    basicAnalytics: true,
    advancedAnalytics: false,
    weakness: "basic",
    wrongAnswerDna: false,
    spacedRepetition: true,
    recommendation: "basic",
    advancedRecommendation: false,
    customThemes: "none",
    ads: true,
  },
  TRIAL_EXPIRED: {
    // Generation blocked; existing data stays viewable (those reads aren't gated
    // here). Ads OFF — the upgrade prompt replaces them.
    limits: { AI_PROBLEM_GENERATION: 0, MOCK_EXAM_GENERATION: 0, STUDY_BOOK_GENERATION: 0 },
    basicAnalytics: true,
    advancedAnalytics: false,
    weakness: "basic",
    wrongAnswerDna: false,
    spacedRepetition: true,
    recommendation: "none",
    advancedRecommendation: false,
    customThemes: "none",
    ads: false,
  },
  PRO: {
    limits: { AI_PROBLEM_GENERATION: 50, MOCK_EXAM_GENERATION: 10, STUDY_BOOK_GENERATION: 5 },
    basicAnalytics: true,
    advancedAnalytics: true,
    weakness: "detailed",
    wrongAnswerDna: true,
    spacedRepetition: true,
    recommendation: "basic",
    advancedRecommendation: false,
    customThemes: "some",
    ads: false,
  },
  PREMIUM: {
    limits: { AI_PROBLEM_GENERATION: null, MOCK_EXAM_GENERATION: null, STUDY_BOOK_GENERATION: null },
    basicAnalytics: true,
    advancedAnalytics: true,
    weakness: "advanced",
    wrongAnswerDna: true,
    spacedRepetition: true,
    recommendation: "advanced",
    advancedRecommendation: true,
    customThemes: "all",
    ads: false,
  },
};

/** The per-window numeric limit for a metered feature (null = unlimited). */
export function getFeatureLimit(state: AccessState, feature: MeteredFeature): Limit {
  return ACCESS_ENTITLEMENTS[state].limits[feature];
}

export function isUnlimited(limit: Limit): boolean {
  return limit === null;
}

/** Which window a metered feature's limit is counted over, for this state. */
export function getUsageWindow(state: AccessState, feature: MeteredFeature): UsageWindow {
  // Daily quota for problem generation; MOCK_EXAM + STUDY_BOOK reset per
  // trial (during trial), per month on PRO, and are uncapped on PREMIUM.
  if (feature === "AI_PROBLEM_GENERATION") return "day";
  switch (state) {
    case "PRO":
      return "month";
    case "PREMIUM":
      return "unlimited";
    case "TRIAL":
    case "TRIAL_EXPIRED":
    default:
      return "trial";
  }
}

export function getFeatureTier(state: AccessState, feature: FeatureKey): Tier {
  const e = ACCESS_ENTITLEMENTS[state];
  switch (feature) {
    case "WEAKNESS_ANALYSIS":
      return e.weakness;
    case "AI_RECOMMENDATION":
      return e.recommendation;
    default:
      return "none";
  }
}

/**
 * Whether an access state may use a feature.
 *  - metered: usable while the limit is non-zero (0 → blocked, e.g. expired trial).
 *  - BASIC_ANALYTICS / SPACED_REPETITION: baseline features (kept broad).
 *  - ADVANCED_ANALYTICS / WRONG_ANSWER_DNA / ADVANCED_AI_RECOMMENDATION: booleans.
 *  - WEAKNESS_ANALYSIS: the *advanced* weakness view (≥ detailed); basic numbers
 *    are shown to everyone and aren't gated through this.
 *  - AI_RECOMMENDATION: any recommendation (≥ basic).
 *  - CUSTOM_THEMES: any extra themes beyond the default.
 */
export function canUseFeature(state: AccessState, feature: FeatureKey): boolean {
  const e = ACCESS_ENTITLEMENTS[state];
  switch (feature) {
    case "AI_PROBLEM_GENERATION":
    case "MOCK_EXAM_GENERATION": {
      const limit = e.limits[feature];
      return limit === null || limit > 0;
    }
    case "BASIC_ANALYTICS":
      return e.basicAnalytics;
    case "ADVANCED_ANALYTICS":
      return e.advancedAnalytics;
    case "WEAKNESS_ANALYSIS":
      return tierAtLeast(e.weakness, "detailed");
    case "WRONG_ANSWER_DNA":
      return e.wrongAnswerDna;
    case "SPACED_REPETITION":
      return e.spacedRepetition;
    case "AI_RECOMMENDATION":
      return tierAtLeast(e.recommendation, "basic");
    case "ADVANCED_AI_RECOMMENDATION":
      return e.advancedRecommendation;
    case "CUSTOM_THEMES":
      return e.customThemes !== "none";
    default:
      return false;
  }
}

export function getThemeAccess(state: AccessState): ThemeAccess {
  return ACCESS_ENTITLEMENTS[state].customThemes;
}

/** Only TRIAL_ACTIVE sees ads; expired trial and paid plans don't. */
export function shouldShowAds(state: AccessState): boolean {
  return ACCESS_ENTITLEMENTS[state].ads;
}

/**
 * The lowest PLAN (TRIAL→PRO→PREMIUM, ignoring expiry) that unlocks a feature,
 * for upgrade messaging. Returns null if TRIAL already has it.
 */
export function minPlanForFeature(feature: FeatureKey): Plan | null {
  const stateForPlan: Record<Plan, AccessState> = {
    TRIAL: "TRIAL",
    PRO: "PRO",
    PREMIUM: "PREMIUM",
  };
  const found = PLANS.find((p) => canUseFeature(stateForPlan[p], feature));
  if (!found || found === "TRIAL") return null;
  return found;
}

/** Human label for the min plan that unlocks a feature ("PRO", "PREMIUM"). */
export function upgradePlanLabel(feature: FeatureKey): string | null {
  const min = minPlanForFeature(feature);
  return min ? PLAN_META[min].name : null;
}
