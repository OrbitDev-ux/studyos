import "server-only";
import { prisma } from "@/lib/prisma";
import {
  countGenerationUsage,
  usageWindowStart,
} from "@/features/ai/generation-guard";
import {
  canUseFeature,
  getFeatureLimit,
  shouldShowAds,
  type Limit,
} from "@/features/billing/entitlements";
import type { Plan, SubscriptionStatus } from "@/features/billing/plans";
import {
  effectiveStatus,
  resolveAccessState,
  resolveTrialEndsAt,
  trialDaysRemaining,
  type AccessState,
  type SubscriptionInput,
} from "@/features/billing/subscription";

export type MeteredUsage = { limit: Limit; used: number };

export type PlanSummary = {
  plan: Plan;
  state: AccessState;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  features: {
    aiProblemGeneration: MeteredUsage;
    mockExamGeneration: MeteredUsage;
    advancedAnalytics: boolean;
    weaknessAnalysis: boolean;
    wrongAnswerDna: boolean;
    aiRecommendation: boolean;
    advancedAiRecommendation: boolean;
    customThemes: boolean;
    ads: boolean;
  };
};

/**
 * The authoritative plan + usage snapshot for a user, assembled from the DB plan
 * + trial dates (server clock) and the AiGenerationLog usage counts. Shared by
 * GET /api/plan/me, the settings/profile subscription card, and the dashboard
 * trial banner — one source of truth, never derived on the client.
 */
export async function getPlanSummary(userId: string): Promise<PlanSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, timezone: true, trialStartedAt: true, trialEndsAt: true },
  });
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");

  const now = new Date();
  const input: SubscriptionInput = {
    plan: user.plan,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
  };
  const state = resolveAccessState(input, now);
  const winCtx = { timezone: user.timezone, trialStartedAt: user.trialStartedAt };

  const problemStart = usageWindowStart(state, "problem", winCtx, now);
  const mockStart = usageWindowStart(state, "mock-exam", winCtx, now);

  const [problemUsed, mockUsed] = await Promise.all([
    problemStart ? countGenerationUsage(userId, "problem", problemStart) : Promise.resolve(0),
    mockStart ? countGenerationUsage(userId, "mock-exam", mockStart) : Promise.resolve(0),
  ]);

  return {
    plan: user.plan,
    state,
    status: effectiveStatus(input, now),
    trialEndsAt: resolveTrialEndsAt(input)?.toISOString() ?? null,
    trialDaysRemaining: trialDaysRemaining(input, now),
    features: {
      aiProblemGeneration: {
        limit: getFeatureLimit(state, "AI_PROBLEM_GENERATION"),
        used: problemUsed,
      },
      mockExamGeneration: {
        limit: getFeatureLimit(state, "MOCK_EXAM_GENERATION"),
        used: mockUsed,
      },
      advancedAnalytics: canUseFeature(state, "ADVANCED_ANALYTICS"),
      weaknessAnalysis: canUseFeature(state, "WEAKNESS_ANALYSIS"),
      wrongAnswerDna: canUseFeature(state, "WRONG_ANSWER_DNA"),
      aiRecommendation: canUseFeature(state, "AI_RECOMMENDATION"),
      advancedAiRecommendation: canUseFeature(state, "ADVANCED_AI_RECOMMENDATION"),
      customThemes: canUseFeature(state, "CUSTOM_THEMES"),
      ads: shouldShowAds(state),
    },
  };
}
