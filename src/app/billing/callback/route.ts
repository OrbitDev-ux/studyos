import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/session";
import { PLAN_META, type Plan } from "@/features/billing/plans";
import { applyPaymentEvent } from "@/features/billing/payment-service";
import { chargeBillingKey, deleteBillingKey, issueBillingKey } from "@/features/billing/toss-client";

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/**
 * GET /billing/callback — where Toss's billing-auth widget redirects the
 * browser after the user registers a card (see requestBillingAuth's
 * successUrl/failUrl in upgrade-checkout-button.tsx). This is the ONLY place
 * that exchanges the one-time authKey for a durable billingKey and fires the
 * first charge; nothing here trusts client-supplied amounts — the charged
 * amount always comes from PLAN_META, server-side.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const resultUrl = new URL("/profile", url.origin);
  const plan = params.get("plan");

  if (params.get("status") === "fail" || (plan !== "PRO" && plan !== "PREMIUM")) {
    resultUrl.searchParams.set("billing", "fail");
    return NextResponse.redirect(resultUrl);
  }

  const user = await requireCurrentUser();
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
