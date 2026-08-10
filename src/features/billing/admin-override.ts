"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Plan } from "@/features/billing/plans";
import { PLANS } from "@/features/billing/plans";
import {
  effectivePlan,
  effectiveStatus,
  resolveAccessState,
  type AccessState,
} from "@/features/billing/subscription";
import { requireAdmin } from "@/lib/admin/context";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin-only TEST plan override — lets an admin flip THEIR OWN StudyOS account's
 * effective plan (TRIAL/PRO/PREMIUM) to test entitlement-gated features, WITHOUT
 * touching any real billing/subscription data. It only writes the
 * adminPlanOverride / adminPlanOverrideEnabled columns on the admin's own User
 * row; the effective entitlement is computed centrally in resolveAccessState, so
 * the whole app (generation guard, canUseFeature, ads, …) reflects it.
 *
 * SECURITY:
 *  - requireAdmin() gates every action server-side (admin session required).
 *  - The target is ALWAYS the CURRENT StudyOS app-session user (auth()), resolved
 *    server-side — there is no userId parameter, so a request can never target
 *    another user (no IDOR). This applies the override to exactly the account the
 *    admin is browsing StudyOS with (not an email-matched guess).
 *  - Real billing columns (plan/subscriptionStatus/trial*) are never written.
 */

const planSchema = z.enum(PLANS);
const saveSchema = z.object({ enabled: z.boolean(), plan: planSchema });

export type OverrideView =
  | { hasUser: false; adminEmail: string }
  | {
      hasUser: true;
      adminEmail: string;
      userEmail: string;
      realPlan: Plan;
      realAccessState: AccessState;
      realStatus: string;
      overrideEnabled: boolean;
      overridePlan: Plan | null;
      effectivePlan: Plan;
      effectiveAccessState: AccessState;
    };

/** The CURRENT StudyOS app-session user (Auth.js). Null when the admin is not
 * also logged into the StudyOS app in this browser. Requires an admin session
 * first (requireAdmin at the call site) — this only resolves WHICH user. */
async function findAppSessionUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      plan: true,
      subscriptionStatus: true,
      trialStartedAt: true,
      trialEndsAt: true,
      adminPlanOverride: true,
      adminPlanOverrideEnabled: true,
    },
  });
}

export async function getMyOverrideState(): Promise<OverrideView> {
  const admin = await requireAdmin();
  const user = await findAppSessionUser();
  if (!user) return { hasUser: false, adminEmail: admin.email };

  const realInput = {
    plan: user.plan,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
  };
  const effInput = {
    ...realInput,
    adminPlanOverride: user.adminPlanOverride,
    adminPlanOverrideEnabled: user.adminPlanOverrideEnabled,
  };

  return {
    hasUser: true,
    adminEmail: admin.email,
    userEmail: user.email,
    realPlan: user.plan,
    realAccessState: resolveAccessState(realInput),
    realStatus: effectiveStatus(realInput),
    overrideEnabled: user.adminPlanOverrideEnabled,
    overridePlan: user.adminPlanOverride,
    effectivePlan: effectivePlan(effInput),
    effectiveAccessState: resolveAccessState(effInput),
  };
}

/** Enable/adjust the override for the admin's own account. */
export async function savePlanOverride(input: {
  enabled: boolean;
  plan: string;
}): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "올바른 플랜을 선택해주세요." };

  const user = await findAppSessionUser();
  if (!user) {
    return {
      error:
        "StudyOS 앱에 로그인되어 있지 않아요. 오버라이드할 계정으로 앱에 로그인한 뒤 다시 시도하세요.",
    };
  }

  const before = {
    enabled: user.adminPlanOverrideEnabled,
    plan: user.adminPlanOverride,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      adminPlanOverride: parsed.data.plan,
      adminPlanOverrideEnabled: parsed.data.enabled,
    },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: parsed.data.enabled
      ? ADMIN_ACTIONS.PLAN_OVERRIDE_SET
      : ADMIN_ACTIONS.PLAN_OVERRIDE_DISABLE,
    targetType: "user",
    targetId: user.id,
    detail: {
      from: before,
      to: { enabled: parsed.data.enabled, plan: parsed.data.plan },
    },
  });

  // Effective entitlement is cross-cutting — refresh every server-rendered
  // surface so dashboard/billing/feature availability reflect the new state.
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Turn the override OFF (keeps the chosen plan for convenience). */
export async function disablePlanOverride(): Promise<
  { ok: true } | { error: string }
> {
  const admin = await requireAdmin();
  const user = await findAppSessionUser();
  if (!user) return { error: "StudyOS 앱에 로그인되어 있지 않아요." };

  const before = {
    enabled: user.adminPlanOverrideEnabled,
    plan: user.adminPlanOverride,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { adminPlanOverrideEnabled: false },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.PLAN_OVERRIDE_DISABLE,
    targetType: "user",
    targetId: user.id,
    detail: { from: before, to: { enabled: false, plan: before.plan } },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
