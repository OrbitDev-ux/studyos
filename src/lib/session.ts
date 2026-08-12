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
      "id, name, email, image, timezone, school, plan, subscriptionStatus, trialStartedAt, trialEndsAt, adminPlanOverride, adminPlanOverrideEnabled, bannedAt, passwordChangedAt",
    )
    .eq("id", session.user.id)
    .single();
  if (error) throw error;

  // A banned account keeps its data but loses access everywhere the app gates
  // through requireCurrentUser. The admin ban action sets bannedAt; without
  // this check the ban would have no effect at all.
  if ((data as { bannedAt: string | null }).bannedAt) {
    redirect("/suspended");
  }

  // Session invalidation: a password reset stamps passwordChangedAt, so any
  // JWT session issued before then (e.g. on another device) is no longer valid.
  const passwordChangedAt = (data as { passwordChangedAt: string | null }).passwordChangedAt;
  const loginAt = session.user.loginAt;
  if (passwordChangedAt && loginAt && loginAt < new Date(passwordChangedAt).getTime()) {
    redirect("/login");
  }

  return data as CurrentUser;
}
