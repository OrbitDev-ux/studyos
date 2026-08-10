import type { Plan, SubscriptionStatus } from "@/features/billing/plans";
import { TRIAL_DAYS } from "@/features/billing/plans";

/**
 * Trial/subscription resolution — pure. Trial expiry is computed from
 * trialEndsAt (or trialStartedAt + TRIAL_DAYS as a fallback) versus the SERVER's
 * `now`, never trusted from a single stored flag or the client. All entitlement
 * decisions key off the resolved AccessState.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The effective access level after accounting for trial expiry. */
export type AccessState = "TRIAL" | "TRIAL_EXPIRED" | "PRO" | "PREMIUM";

export type SubscriptionInput = {
  plan: Plan;
  trialStartedAt: Date | string | null;
  trialEndsAt: Date | string | null;
  /**
   * Admin-only TEST override (features/billing/admin-override). When
   * `adminPlanOverrideEnabled` is true, entitlement resolution uses
   * `adminPlanOverride` as the plan INSTEAD of the real billing `plan` — the
   * real subscription/billing data is never changed. Optional so existing
   * callers/tests that don't set them behave exactly as before.
   */
  adminPlanOverride?: Plan | null;
  adminPlanOverrideEnabled?: boolean | null;
};

/**
 * The plan that actually governs entitlements: the admin test override when
 * enabled, else the real billing plan. Priority is System Security > Real
 * Billing > Admin Override — security gates (e.g. ban) run before any
 * entitlement check, so they are unaffected by this.
 */
export function effectivePlan(input: SubscriptionInput): Plan {
  return input.adminPlanOverrideEnabled && input.adminPlanOverride
    ? input.adminPlanOverride
    : input.plan;
}

function coerce(value: Date | string | null): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** trialEndsAt as stored, else derived from trialStartedAt + TRIAL_DAYS. */
export function resolveTrialEndsAt(input: SubscriptionInput): Date | null {
  const explicit = coerce(input.trialEndsAt);
  if (explicit) return explicit;
  const start = coerce(input.trialStartedAt);
  return start ? new Date(start.getTime() + TRIAL_DAYS * DAY_MS) : null;
}

/** Whether a TRIAL user's window has elapsed. Non-trial plans are never expired. */
export function isTrialExpired(input: SubscriptionInput, now: Date = new Date()): boolean {
  if (input.plan !== "TRIAL") return false;
  const end = resolveTrialEndsAt(input);
  // No trial dates at all → treat as active (fail open for the user, not locked).
  return end != null && now.getTime() > end.getTime();
}

/** Whole days left in the trial (0 when past), or null when not on trial. */
export function trialDaysRemaining(
  input: SubscriptionInput,
  now: Date = new Date(),
): number | null {
  if (input.plan !== "TRIAL") return null;
  const end = resolveTrialEndsAt(input);
  if (!end) return null;
  const ms = end.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

/** The authoritative access state used for every entitlement check. Honors the
 * admin test override (effectivePlan) — never the raw billing plan directly. */
export function resolveAccessState(
  input: SubscriptionInput,
  now: Date = new Date(),
): AccessState {
  const plan = effectivePlan(input);
  if (plan === "PRO") return "PRO";
  if (plan === "PREMIUM") return "PREMIUM";
  // TRIAL (real or overridden): trial-expiry is evaluated against the trial
  // dates, forcing plan=TRIAL so the (override-agnostic) isTrialExpired applies.
  return isTrialExpired({ ...input, plan: "TRIAL" }, now) ? "TRIAL_EXPIRED" : "TRIAL";
}

/** Effective lifecycle status for API/UI (computed, not just the stored value). */
export function effectiveStatus(
  input: SubscriptionInput,
  now: Date = new Date(),
): SubscriptionStatus {
  switch (input.plan) {
    case "PRO":
    case "PREMIUM":
      return "ACTIVE";
    case "TRIAL":
    default:
      return isTrialExpired(input, now) ? "EXPIRED" : "TRIALING";
  }
}
