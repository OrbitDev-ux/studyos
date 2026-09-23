import { NextResponse } from "next/server";
import { applyPolarWebhook } from "@/features/billing/polar-events";
import { verifyPolarWebhookSignature } from "@/features/billing/polar-client";

/**
 * POST /api/webhooks/polar — register this URL in the Polar organization
 * settings and enable at least: checkout.created/updated/confirmed,
 * order.paid, order.refunded, subscription.created/active/updated/canceled/
 * past_due/uncanceled/revoked.
 *
 * Fail-closed contract:
 *  - No POLAR_WEBHOOK_SECRET configured → 500. We cannot verify the event, so
 *    we DON'T process it and DON'T acknowledge it — Polar keeps retrying (up
 *    to ~3 days) until the operator fixes the config, which guarantees a paid
 *    order can never be silently dropped while misconfigured.
 *  - Bad/missing signature → 401 (rejected before any state is touched).
 *  - Only after the signature check does the event reach polar-events.ts's
 *    applyPolarWebhook, which is idempotent on Polar's redeliveries
 *    (applyPaymentEvent/applyRefundEvent dedupe by unique keys). A 500 on
 *    processing failure makes Polar retry a transient error.
 *
 * Unlike Toss, Polar's payloads ARE signed, so no re-fetch dance is needed —
 * the signature + idempotent writes are the trust story. Timestamp replay
 * tolerance is not applicable to Polar's plain hex signature format; the
 * env-configured secret is the authority (see polar-client.ts).
 */
export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "webhook not configured (POLAR_WEBHOOK_SECRET missing)" },
      { status: 500 },
    );
  }

  const payload = await request.text();
  let body: { type?: unknown; id?: unknown; data?: unknown };
  try {
    body = JSON.parse(payload) as { type?: unknown; id?: unknown; data?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Standard Webhooks framing: the event id lives in the `webhook-id` header,
  // not the body (Polar delivers {type, timestamp, api_version, data}); older
  // inline `body.id` payloads keep working as a fallback.
  const webhookId =
    request.headers.get("webhook-id") ?? (typeof body.id === "string" ? body.id : null);

  const verified = verifyPolarWebhookSignature({
    payload,
    secret,
    signatureHeader: request.headers.get("Polar-Signature") ?? request.headers.get("webhook-signature"),
    webhookId: request.headers.get("webhook-id"),
    webhookTimestamp: request.headers.get("webhook-timestamp"),
  });
  if (!verified) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (typeof body.type !== "string" || typeof webhookId !== "string" || webhookId.length === 0) {
    return NextResponse.json({ error: "invalid event shape" }, { status: 400 });
  }

  try {
    await applyPolarWebhook({
      id: webhookId,
      type: body.type,
      data: (body.data ?? {}) as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhooks/polar] failed", error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}