import { isPolarConfigured } from "@/features/billing/polar-client";
import { isTossConfigured } from "@/features/billing/toss-client";

/** New sales are intentionally paused while StudyOS is a free-only product. */
export const FREE_ONLY_MODE = true;

/**
 * Which payment provider is active for NEW checkouts, and whether ANY checkout
 * flow can run at all.
 *
 * Historical provider clients remain for webhook and record compatibility.
 * FREE_ONLY_MODE makes new sales inactive without deleting that history.
 */
export function activeBillingProvider(): "polar" | "toss" | null {
  if (FREE_ONLY_MODE) return null;
  if (isPolarConfigured()) return "polar";
  if (isTossConfigured()) return "toss";
  return null;
}

/** True when SOME payment provider is configured well enough to charge. */
export function isBillingConfigured(): boolean {
  if (FREE_ONLY_MODE) return false;
  return activeBillingProvider() !== null;
}

/**
 * True when the checkout UI can actually start a session today. Besides the
 * provider being configured this requires the Toss PUBLIC client key when the
 * active provider is Toss (the client SDK needs it), whereas Polar's checkout
 * is a pure server-side redirect.
 */
export function isCheckoutUsable(): boolean {
  if (FREE_ONLY_MODE) return false;
  if (activeBillingProvider() === "polar") return true;
  if (activeBillingProvider() === "toss") {
    return Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
  }
  return false;
}
