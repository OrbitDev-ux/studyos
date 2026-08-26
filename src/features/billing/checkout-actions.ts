"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { isTossConfigured } from "@/features/billing/toss-client";

export type BillingAuthConfig = {
  clientKey: string;
  customerKey: string;
  customerEmail: string;
  customerName: string;
};

/**
 * Server-side half of starting a checkout: validates the plan and the
 * session, and hands the client only what it needs to open Toss's billing
 * widget (requestBillingAuth). The secret key never leaves the server —
 * issuing/charging the billing key happens in the /billing/callback route
 * after Toss redirects back with an authKey.
 */
export async function getBillingAuthConfig(
  plan: string,
): Promise<{ ok: true; config: BillingAuthConfig } | { ok: false; error: string }> {
  const user = await requireCurrentUser();
  if (plan !== "PRO" && plan !== "PREMIUM") {
    return { ok: false, error: "잘못된 플랜입니다." };
  }

  // Checked against the real billing plan (not the admin test override —
  // that never reflects actual paid entitlement, see subscription.ts). Blocks
  // a pointless re-checkout for the plan the user is already really on; real
  // upgrades/downgrades between PRO and PREMIUM are still allowed through and
  // handled by applyPaymentEvent, which supersedes the old subscription.
  if (user.plan === plan) {
    return { ok: false, error: "이미 이용 중인 플랜이에요." };
  }

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey || !isTossConfigured()) {
    return { ok: false, error: "결제 기능은 아직 활성화되지 않았습니다." };
  }

  return {
    ok: true,
    config: {
      clientKey,
      customerKey: user.id,
      customerEmail: user.email,
      customerName: user.name ?? user.email,
    },
  };
}

/** Marks the caller's active subscription to lapse at period end instead of
 * renewing. Access stays PRO/PREMIUM until currentPeriodEnd — the renewal
 * cron is what actually reverts the plan when that date arrives. */
export async function cancelSubscription(): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();
  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return { ok: false, error: "활성 구독이 없어요." };

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });
  revalidatePath("/profile");
  revalidatePath("/pricing");
  return { ok: true };
}

/** Undoes a pending cancellation — the subscription keeps renewing normally. */
export async function resumeSubscription(): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();
  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, status: "ACTIVE", cancelAtPeriodEnd: true },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return { ok: false, error: "취소 예정인 구독이 없어요." };

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: false },
  });
  revalidatePath("/profile");
  revalidatePath("/pricing");
  return { ok: true };
}
