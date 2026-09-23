import { isPolarConfigured } from "@/features/billing/polar-client";
import { isTossConfigured } from "@/features/billing/toss-client";

/**
 * Which payment provider is active for NEW checkouts, and whether ANY checkout
 * flow can run at all.
 *
 * Ordering is deliberate and hard-coded: Polar is the primary provider — when
 * it's configured (token + price ids, see polar-client.ts's isPolarConfigured),
 * ALL new checkouts go through it. Toss is only a legacy fallback for
 * subscribers/create flows when Polar is NOT configured; existing Toss
 * billing-key subscriptions are still charged by the renewal cron regardless
 * (renewal.ts filters on the subscription's own paymentProvider).
 *
 * Fail-closed: no provider configured → no checkout, no silent fallback that
 * charges nothing. Pricing/CTA surfaces read isBillingConfigured() and render
 * an honest disabled state instead of a dead button.
 */
export function activeBillingProvider(): "polar" | "toss" | null {
  if (isPolarConfigured()) return "polar";
  if (isTossConfigured()) return "toss";
  return null;
}

/** True when SOME payment provider is configured well enough to charge. */
export function isBillingConfigured(): boolean {
  return activeBillingProvider() !== null;
}

/**
 * True when the checkout UI can actually start a session today. Besides the
 * provider being configured this requires the Toss PUBLIC client key when the
 * active provider is Toss (the client SDK needs it), whereas Polar's checkout
 * is a pure server-side redirect.
 */
export function isCheckoutUsable(): boolean {
  if (activeBillingProvider() === "polar") return true;
  if (activeBillingProvider() === "toss") {
    return Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
  }
  return false;
}