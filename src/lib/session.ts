import { redirect } from "next/navigation";
import type { Plan, SubscriptionStatus } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  timezone: string;
  school: string | null;
  /** Explicit UI locale; null = AUTO. Validated on read by the i18n resolver. */
  locale: string | null;
  /** Subscription plan; the authoritative server value used for entitlements. */
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  /** ISO strings from Supabase; null only for rows created before the backfill. */
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  /** Admin-only TEST plan override (features/billing/admin-override). Flows into
   * accessStateFor so every entitlement check reflects it. Never affects billing. */
  adminPlanOverride: Plan | null;
  adminPlanOverrideEnabled: boolean;
};

export async function requireCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("User")
    .select(
      "id, name, email, image, timezone, school, locale, plan, subscriptionStatus, trialStartedAt, trialEndsAt, adminPlanOverride, adminPlanOverrideEnabled, bannedAt, passwordChangedAt",
    )
    .eq("id", session.user.id)
    .single();
  if (error) {
    // A deleted account can still have a stale JWT. Treat the missing row as
    // an invalid session instead of leaking a database error to the user.
    if (error.code === "PGRST116") redirect("/login?deleted=1");
    throw error;
  }
  if (!data) redirect("/login?deleted=1");

  // A banned account keeps its data but loses access everywhere the app gates
  // through requireCurrentUser. The admin ban action sets bannedAt; without
  // this check the ban would have no effect at all.
  if ((data as { bannedAt: string | null }).bannedAt) {
    redirect("/suspended");
  }

  // Session invalidation: a password reset stamps passwordChangedAt, so any
  // JWT session issued before then (e.g. on another device) is no longer valid.
  const passwordChangedAt = (data as { passwordChangedAt: string | null })
    .passwordChangedAt;
  const loginAt = session.user.loginAt;
  if (passwordChangedAt && loginAt && loginAt < new Date(passwordChangedAt).getTime()) {
    redirect("/login");
  }

  return data as CurrentUser;
}

/**
 * Same session→user resolution as requireCurrentUser(), but returns null
 * instead of calling redirect() on any failure (no session, deleted account,
 * ban, or a stale JWT from before a password reset). For Route Handlers
 * called via fetch() rather than page navigation — a redirect() response
 * would be silently followed by fetch and hand back the wrong content-type
 * instead of a clean 401, so those callers need a plain null to turn into
 * their own JSON error response (see /api/plan/me/route.ts's `auth()` +
 * 401-JSON convention, which this generalizes for callers that also need the
 * full CurrentUser shape for billing/entitlement checks, not just the id).
 *
 * Kept as a small parallel implementation rather than a shared refactor of
 * requireCurrentUser() — that function is used across the whole app and its
 * three distinct redirect targets (/login, /login?deleted=1, /suspended)
 * don't collapse cleanly into a single null-check contract without changing
 * its behavior for every existing caller.
 */
export async function getCurrentUserOrNull(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("User")
    .select(
      "id, name, email, image, timezone, school, locale, plan, subscriptionStatus, trialStartedAt, trialEndsAt, adminPlanOverride, adminPlanOverrideEnabled, bannedAt, passwordChangedAt",
    )
    .eq("id", session.user.id)
    .single();
  if (error) {
    // A deleted account can still have a stale JWT — same "not authenticated"
    // treatment as requireCurrentUser(). Any OTHER error is unexpected (a real
    // DB failure), so it's rethrown rather than misreported as a 401 — the
    // Route Handler's own error handling turns it into a 500 instead.
    if (error.code === "PGRST116") return null;
    throw error;
  }
  if (!data) return null;

  const row = data as { bannedAt: string | null; passwordChangedAt: string | null };
  if (row.bannedAt) return null;

  const loginAt = session.user.loginAt;
  if (
    row.passwordChangedAt &&
    loginAt &&
    loginAt < new Date(row.passwordChangedAt).getTime()
  ) {
    return null;
  }

  return data as CurrentUser;
}
