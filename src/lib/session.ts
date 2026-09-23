import { redirect } from "next/navigation";
import type { Plan, SubscriptionStatus, User as UserRow } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  /** ISO strings; null only for rows created before the backfill. */
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  /** Admin-only TEST plan override (features/billing/admin-override). Flows into
   * accessStateFor so every entitlement check reflects it. Never affects billing. */
  adminPlanOverride: Plan | null;
  adminPlanOverrideEnabled: boolean;
};

const CURRENT_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  timezone: true,
  school: true,
  locale: true,
  plan: true,
  subscriptionStatus: true,
  trialStartedAt: true,
  trialEndsAt: true,
  adminPlanOverride: true,
  adminPlanOverrideEnabled: true,
  bannedAt: true,
  passwordChangedAt: true,
} as const;

/** Map a Prisma row to CurrentUser: timestamps arrive as Date from Prisma but
 * the former Supabase client returned ISO strings — preserve that contract. */
function toCurrentUser(row: Pick<UserRow, keyof typeof CURRENT_USER_SELECT>): CurrentUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    timezone: row.timezone,
    school: row.school,
    locale: row.locale,
    plan: row.plan,
    subscriptionStatus: row.subscriptionStatus,
    trialStartedAt: row.trialStartedAt?.toISOString() ?? null,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    adminPlanOverride: row.adminPlanOverride,
    adminPlanOverrideEnabled: row.adminPlanOverrideEnabled,
  };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Anon-REST trust boundary closed: resolve the session's user through Prisma
  // (owner role) instead of the public Supabase endpoint.
  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: CURRENT_USER_SELECT,
  });
  if (!row) redirect("/login?deleted=1");

  // A banned account keeps its data but loses access everywhere the app gates
  // through requireCurrentUser. The admin ban action sets bannedAt; without
  // this check the ban would have no effect at all.
  if (row.bannedAt) {
    redirect("/suspended");
  }

  // Session invalidation: a password reset stamps passwordChangedAt, so any
  // JWT session issued before then (e.g. on another device) is no longer valid.
  const loginAt = session.user.loginAt;
  if (row.passwordChangedAt && loginAt && loginAt < row.passwordChangedAt.getTime()) {
    redirect("/login");
  }

  return toCurrentUser(row);
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

  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: CURRENT_USER_SELECT,
  });
  if (!row) return null;

  if (row.bannedAt) return null;

  const loginAt = session.user.loginAt;
  if (row.passwordChangedAt && loginAt && loginAt < row.passwordChangedAt.getTime()) {
    return null;
  }

  return toCurrentUser(row);
}
