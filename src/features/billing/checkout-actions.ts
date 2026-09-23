"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { SITE_URL } from "@/lib/site-url";
import { isTossConfigured } from "@/features/billing/toss-client";
import {
  createPolarCheckoutSession,
  polarProductIdForPlan,
  updatePolarSubscription,
} from "@/features/billing/polar-client";
import { activeBillingProvider } from "@/features/billing/providers";
import { capture } from "@/features/analytics/capture";
import { isGuestEmail } from "@/features/ai/quota";
import { isPlan } from "@/features/billing/plans";

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
  // Launch policy: only PRO is for sale; PREMIUM is not-for-sale → fail closed
  // regardless of any leftover configuration.
  if (!isPlan(plan)) {
    return { ok: false, error: "잘못된 플랜입니다." };
  }
  if (plan !== "PRO") {
    return { ok: false, error: "PREMIUM은 현재 판매하지 않는 플랜이에요." };
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

export type CheckoutStart =
  | { ok: true; kind: "polar"; checkoutUrl: string }
  | { ok: true; kind: "toss"; config: BillingAuthConfig }
  | { ok: false; error: string };

/**
 * Provider-aware checkout kicker. Polar is primary when configured (see
 * providers.ts) — it returns a hosted checkout URL and the client redirects.
 * Otherwise the legacy Toss billing-auth flow returns a config the client SDK
 * opens as a widget. Shared safety rails with getBillingAuthConfig: plan
 * validation and the same-plan guard. Fail-closed: neither provider
 * configured → an honest error, never a zero-charge "success".
 */
export async function startCheckout(plan: string): Promise<CheckoutStart> {
  const user = await requireCurrentUser();
  // Launch policy: PRO ($9.99 / month) is the only purchasable plan. PREMIUM
  // (not-for-sale) and anything else never open a checkout — fail closed.
  if (!isPlan(plan)) {
    return { ok: false, error: "잘못된 플랜입니다." };
  }
  if (plan !== "PRO") {
    return { ok: false, error: "PREMIUM은 현재 판매하지 않는 플랜이에요." };
  }
  if (user.plan === plan) {
    return { ok: false, error: "이미 이용 중인 플랜이에요." };
  }

  if (activeBillingProvider() === "polar") {
    try {
      const checkout = await createPolarCheckoutSession({
        productId: polarProductIdForPlan(plan as "PRO"),
        // Guest addresses (@guest.studyos.app) have no real domain → Polar
        // rejects them (422). Omit so Polar captures the payer's email inline.
        customerEmail: isGuestEmail(user.email) ? null : user.email,
        externalCustomerId: user.id,
        successUrl: `${SITE_URL}/billing/callback?plan=${plan}&checkout_id={CHECKOUT_ID}`,
        metadata: { plan, userId: user.id },
      });
      capture({
        name: "checkout_started",
        props: { plan, provider: "polar" },
      });
      return { ok: true, kind: "polar", checkoutUrl: checkout.url };
    } catch (error) {
      console.error("[checkout-actions] Polar checkout failed", error);
      return {
        ok: false,
        error: "결제창을 여는 중 문제가 발생했어요. 다시 시도해주세요.",
      };
    }
  }

  const result = await getBillingAuthConfig(plan);
  if (!result.ok) return result;
  capture({
    name: "checkout_started",
    props: { plan, provider: "toss" },
  });
  return { ok: true, kind: "toss", config: result.config };
}

/** Marks the caller's active subscription to lapse at period end instead of
 * renewing. Access stays PRO/PREMIUM until currentPeriodEnd — the renewal
 * cron (Toss) or Polar's own scheduler is what actually reverts the plan when
 * that date arrives. For Polar subscriptions the "cancel at period end" flag
 * lives at Polar (the source of truth that stops future charges), so we mirror
 * it remotely FIRST, then locally. */
export async function cancelSubscription(): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();
  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return { ok: false, error: "활성 구독이 없어요." };

  if (subscription.paymentProvider === "polar" && subscription.externalId) {
    try {
      await updatePolarSubscription({
        subscriptionId: subscription.externalId,
        cancelAtPeriodEnd: true,
      });
    } catch (error) {
      console.error("[checkout-actions] Polar cancel failed", error);
      return { ok: false, error: "구독 취소에 실패했어요. 다시 시도해주세요." };
    }
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });
  revalidatePath("/profile");
  revalidatePath("/pricing");
  capture({
    name: "subscription_canceled",
    props: { plan: subscription.plan, atPeriodEnd: true },
  });
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

  if (subscription.paymentProvider === "polar" && subscription.externalId) {
    try {
      await updatePolarSubscription({
        subscriptionId: subscription.externalId,
        cancelAtPeriodEnd: false,
      });
    } catch (error) {
      console.error("[checkout-actions] Polar resume failed", error);
      return { ok: false, error: "구독 재개에 실패했어요. 다시 시도해주세요." };
    }
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: false },
  });
  revalidatePath("/profile");
  revalidatePath("/pricing");
  return { ok: true };
}
