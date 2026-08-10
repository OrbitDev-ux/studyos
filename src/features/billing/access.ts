import "server-only";
import type { CurrentUser } from "@/lib/session";
import { shouldShowAds } from "@/features/billing/entitlements";
import {
  resolveAccessState,
  type AccessState,
  type SubscriptionInput,
} from "@/features/billing/subscription";

/**
 * Server-side glue between the authenticated CurrentUser and the pure billing
 * resolvers. The AccessState is always computed from the DB plan + trial dates
 * + the server clock — never from anything the client sends.
 */
type SubUser = Pick<
  CurrentUser,
  | "plan"
  | "trialStartedAt"
  | "trialEndsAt"
  | "adminPlanOverride"
  | "adminPlanOverrideEnabled"
>;

export function subscriptionInputFor(user: SubUser): SubscriptionInput {
  return {
    plan: user.plan,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
    // Admin test override (server-authoritative; never from the client).
    adminPlanOverride: user.adminPlanOverride,
    adminPlanOverrideEnabled: user.adminPlanOverrideEnabled,
  };
}

export function accessStateFor(user: SubUser, now: Date = new Date()): AccessState {
  return resolveAccessState(subscriptionInputFor(user), now);
}

export function trialStartedDate(user: SubUser): Date | null {
  return user.trialStartedAt ? new Date(user.trialStartedAt) : null;
}

/** Whether this user should be shown ads (only TRIAL-active). Server-decided. */
export function adsVisibleFor(user: SubUser, now: Date = new Date()): boolean {
  return shouldShowAds(accessStateFor(user, now));
}
