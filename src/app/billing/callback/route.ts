import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/session";
import { PLAN_META, type Plan } from "@/features/billing/plans";
import { applyPaymentEvent } from "@/features/billing/payment-service";
import { chargeBillingKey, deleteBillingKey, issueBillingKey } from "@/features/billing/toss-client";
import { getPolarCheckout } from "@/features/billing/polar-client";

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/**
 * GET /billing/callback — two browser-return flows share this route:
 *
 * POLAR (checkout_id present): Polar's hosted checkout redirects here after a
 * payment attempt (the success_url carries `{CHECKOUT_ID}`). This handler only
 * verifies the session state and shows the right banner; the actual entitlement
 * grant happens on the signed `order.paid` webhook (polar-events.ts) — that is
 * the source of truth keyed to the paid order, this redirect itself grants
 * nothing (see polar-client.ts/polar-events.ts for the trust model).
 *
 * TOSS (authKey present): where Toss's billing-auth widget redirects the
 * browser after the user registers a card. This is the ONLY place that
 * exchanges the one-time authKey for a durable billingKey and fires the first
 * charge; nothing here trusts client-supplied amounts — the charged amount
 * always comes from PLAN_META, server-side.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const resultUrl = new URL("/profile", url.origin);
  const plan = params.get("plan");

  // Launch policy: only PRO is for sale; PREMIUM (not-for-sale) fails closed
  // through the Toss legacy rail too.
  if (params.get("status") === "fail" || plan !== "PRO") {
    resultUrl.searchParams.set("billing", "fail");
    return NextResponse.redirect(resultUrl);
  }

  const user = await requireCurrentUser();

  const checkoutId = params.get("checkout_id");
  if (checkoutId) {
    try {
      const checkout = await getPolarCheckout(checkoutId);
      // "confirmed" (payment captured, benefits pending) and "succeeded" are
      // both terminal successes; everything else (open/cancelled/expired/
      // requires_action...) is a failure banner. Banners are cosmetic — the
      // real grant is the order.paid webhook.
      const paid = checkout.status === "confirmed" || checkout.status === "succeeded";
      const ownsCheckout = !checkout.metadata?.userId || checkout.metadata.userId === user.id;
      resultUrl.searchParams.set("billing", paid && ownsCheckout ? "success" : "fail");
    } catch (error) {
      console.error("[billing/callback] polar checkout lookup failed", error);
      resultUrl.searchParams.set("billing", "fail");
    }
    return NextResponse.redirect(resultUrl);
  }

  const authKey = params.get("authKey");
  const customerKey = params.get("customerKey");

  // customerKey must match the logged-in user — this callback is a public
  // redirect target, so anyone could hit it with an arbitrary query string.
  // Toss already scopes authKey to the customerKey used at requestBillingAuth
  // time, but this check keeps the whole flow self-consistent regardless.
  if (!authKey || !customerKey || customerKey !== user.id) {
    resultUrl.searchParams.set("billing", "fail");
    return NextResponse.redirect(resultUrl);
  }

  let billingKey: string | null = null;
  try {
    const issued = await issueBillingKey({ authKey, customerKey });
    billingKey = issued.billingKey;

    const amount = PLAN_META[plan as Plan].priceKrw;
    // Deterministic from authKey (single-use, unique per registration) so a
    // retried request — a double form submit, a browser back/forward — is
    // byte-identical and Toss's Idempotency-Key dedupe applies instead of
    // charging the card twice.
    const idempotencyKey = `first:${shortHash(authKey)}`;
    const orderId = `first-${shortHash(authKey)}`;

    const charge = await chargeBillingKey({
      billingKey,
      customerKey,
      amount,
      orderId,
      orderName: `StudyOS ${PLAN_META[plan as Plan].name}`,
      customerEmail: user.email,
      customerName: user.name ?? user.email,
      idempotencyKey,
    });

    if (charge.status !== "DONE") {
      await deleteBillingKey(billingKey).catch(() => {});
      resultUrl.searchParams.set("billing", "fail");
      return NextResponse.redirect(resultUrl);
    }

    await applyPaymentEvent({
      userId: user.id,
      amount: charge.totalAmount,
      currency: "KRW",
      provider: "toss",
      externalTransactionId: charge.paymentKey,
      idempotencyKey,
      status: "SUCCEEDED",
      plan: plan as Plan,
      paidAt: charge.approvedAt ? new Date(charge.approvedAt) : new Date(),
      subscriptionExternalId: billingKey,
    });

    resultUrl.searchParams.set("billing", "success");
    return NextResponse.redirect(resultUrl);
  } catch (error) {
    console.error("[billing/callback] checkout failed", error);
    if (billingKey) await deleteBillingKey(billingKey).catch(() => {});
    resultUrl.searchParams.set("billing", "fail");
    return NextResponse.redirect(resultUrl);
  }
}
