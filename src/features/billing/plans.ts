import type { Plan } from "@/generated/prisma/client";

/**
 * Plan identity + display metadata. Mirrors the Prisma `Plan` enum (single
 * source: prisma/schema.prisma). Pure/data-only — safe on client and server,
 * unit-testable. New users start on TRIAL (a 7-day experience, not a permanent
 * free tier); entitlements also account for trial expiry (see entitlements.ts).
 *
 * PRICING MODEL (canonical, since the $9.99 launch decision):
 *  - `priceMinor` + `currency` are the CURRENT sale price, currency-neutral
 *    (minor units). PRO = 999 USD / month ($9.99).
 *  - `priceKrw` is the LEGACY monthly KRW amount for the retired Toss
 *    billing-key rail only (historical rows renew in the currency they were
 *    opened with). It is NOT the current catalog price.
 *  - `notForSale` flags plans that remain in history/entitlement code but are
 *    not purchasable on the current catalog (PREMIUM). Entitlement features,
 *    DB enums and migrations for PREMIUM stay untouched; only sales surfaces
 *    mark it not for sale.
 */
export type { Plan } from "@/generated/prisma/client";
export type { SubscriptionStatus } from "@/generated/prisma/client";

export const PLANS = ["TRIAL", "PRO", "PREMIUM"] as const;

/** Trial length in days — the single source of truth (never hardcode 7). */
export const TRIAL_DAYS = 7;

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export type CurrencyCode = "KRW" | "USD";

export type PlanMeta = {
  id: Plan;
  name: string;
  /** Current monthly price in `currency` minor units (0 for TRIAL). */
  priceMinor: number;
  /** Current billing currency of this plan. */
  currency: CurrencyCode;
  /** Preformatted current-sale price label for UI. */
  priceLabel: string;
  /** Legacy monthly KRW amount for the retired Toss billing-key rail.
   * NOT the current catalog price — see priceMinor/currency. */
  priceKrw: number;
  /** Present when the plan is NOT for sale on the current catalog (kept for
   * existing subscribers + history). Never render a purchase CTA for it. */
  notForSale?: boolean;
  tagline: string;
  /** Ascending capability order (TRIAL=0). */
  order: number;
};

export const PLAN_META: Record<Plan, PlanMeta> = {
  TRIAL: {
    id: "TRIAL",
    name: "Trial",
    priceMinor: 0,
    currency: "KRW",
    priceLabel: "무료 체험",
    priceKrw: 0,
    tagline: `${TRIAL_DAYS}일간 StudyOS를 체험해보세요`,
    order: 0,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMinor: 999,
    currency: "USD",
    priceLabel: "$9.99 / 월",
    priceKrw: 4900,
    tagline: "매일 공부하는 학생을 위한 플랜",
    order: 1,
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    priceMinor: 9900,
    currency: "KRW",
    priceLabel: "₩9,900 / 월",
    priceKrw: 9900,
    notForSale: true,
    tagline: "생성·분석을 제한 없이 쓰는 플랜",
    order: 2,
  },
};

/** True if `plan` is at least `min` in capability order (TRIAL < PRO < PREMIUM). */
export function planAtLeast(plan: Plan, min: Plan): boolean {
  return PLAN_META[plan].order >= PLAN_META[min].order;
}

/** Whether a plan is purchasable on the current catalog (notForSale = no CTA). */
export function isPlanForSale(plan: Plan): boolean {
  return !PLAN_META[plan].notForSale;
}
