import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyRefundEvent } from "@/features/billing/payment-service";
import { getTossPayment } from "@/features/billing/toss-client";

type TossWebhookBody = {
  eventType?: string;
  data?: { paymentKey?: string };
};

/**
 * POST /api/webhooks/toss — registered in the Toss developer center
 * (developers.tosspayments.com/my/webhooks) for PAYMENT_STATUS_CHANGED and
 * CANCEL_STATUS_CHANGED.
 *
 * Toss does not sign webhook payloads (no HMAC/shared secret — see
 * docs.tosspayments.com/guides/v2/webhook), so the body is treated purely as
 * a "something changed, go look" trigger: we re-fetch the payment from Toss
 * with our own secret key and act only on that authoritative response.
 * Never trust status/amount fields from the raw POST body.
 *
 * Successful (DONE) charges are recorded synchronously by the flow that
 * initiated them (/billing/callback for the first charge, the renewal cron
 * for recurring ones) — this handler only needs to catch cancellations,
 * since a cancellation issued from the Toss merchant dashboard is the one
 * state change StudyOS has no other way of learning about.
 */
export async function POST(request: Request) {
  let body: TossWebhookBody;
  try {
    body = (await request.json()) as TossWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const paymentKey = body.data?.paymentKey;
  if (!paymentKey) {
    // Event types StudyOS doesn't act on (BrandPay, payouts, seller status,
    // virtual-account deposits) — acknowledge so Toss stops retrying.
    return NextResponse.json({ ok: true });
  }

  try {
    const payment = await getTossPayment(paymentKey);
    if (payment.status !== "CANCELED" && payment.status !== "PARTIAL_CANCELED") {
      return NextResponse.json({ ok: true });
    }

    const existing = await prisma.payment.findUnique({
      where: { externalTransactionId: payment.paymentKey },
      select: { id: true, amount: true },
    });
    // A cancellation for a payment we have no record of isn't ours to act on.
    if (!existing) return NextResponse.json({ ok: true });

    const latestCancel = payment.cancels?.at(-1);
    await applyRefundEvent({
      paymentId: existing.id,
      amount: latestCancel?.cancelAmount ?? existing.amount,
      status: "SUCCEEDED",
      reason: latestCancel?.cancelReason,
      provider: "toss",
      externalRefundId: latestCancel?.transactionKey,
      processedAt: latestCancel?.canceledAt ? new Date(latestCancel.canceledAt) : new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhooks/toss] failed", error);
    // Non-2xx makes Toss retry (up to 7 times over ~3.8 days), so a
    // transient failure (DB blip, Toss API hiccup) can self-heal.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
