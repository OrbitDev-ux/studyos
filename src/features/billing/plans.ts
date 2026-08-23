import type { Plan } from "@/generated/prisma/client";

/**
 * Plan identity + display metadata. Mirrors the Prisma `Plan` enum (single
 * source: prisma/schema.prisma). Pure/data-only — safe on client and server,
 * unit-testable. New users start on TRIAL (a 7-day experience, not a permanent
 * free tier); entitlements also account for trial expiry (see entitlements.ts).
 */
export type { Plan } from "@/generated/prisma/client";
export type { SubscriptionStatus } from "@/generated/prisma/client";

export const PLANS = ["TRIAL", "PRO", "PREMIUM"] as const;

/** Trial length in days — the single source of truth (never hardcode 7). */
export const TRIAL_DAYS = 7;

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export type PlanMeta = {
  id: Plan;
  name: string;
  /** Monthly price in KRW (0 for TRIAL). */
  priceKrw: number;
  /** Preformatted price label for UI. */
  priceLabel: string;
  tagline: string;
  /** Ascending capability order (TRIAL=0). */
  order: number;
};

export const PLAN_META: Record<Plan, PlanMeta> = {
  TRIAL: {
    id: "TRIAL",
    name: "Trial",
    priceKrw: 0,
    priceLabel: "무료 체험",
    tagline: `${TRIAL_DAYS}일간 StudyOS를 체험해보세요`,
    order: 0,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceKrw: 4900,
    priceLabel: "₩4,900 / 월",
    tagline: "매일 공부하는 학생을 위한 플랜",
    order: 1,
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    priceKrw: 9900,
    priceLabel: "₩9,900 / 월",
    tagline: "생성·분석을 제한 없이 쓰는 플랜",
    order: 2,
  },
};

/** True if `plan` is at least `min` in capability order (TRIAL < PRO < PREMIUM). */
export function planAtLeast(plan: Plan, min: Plan): boolean {
  return PLAN_META[plan].order >= PLAN_META[min].order;
}
