import "server-only";

import type { Plan } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { applyPaymentEvent, applyRefundEvent } from "@/features/billing/payment-service";
import {
  getPolarSubscription,
  listPolarRefunds,
  polarPlanForPriceId,
  type PolarOrder,
  type PolarSubscription,
} from "@/features/billing/polar-client";

/**
 * Maps a verified Polar webhook event onto StudyOS's provider-neutral billing
 * records (Subscription/Payment/Refund + the User entitlement columns). This
 * is the ONLY Polar place that writes entitlements — nothing else trusts Polar
 * data, and the webhook route won't even reach here unless the Polar-Signature
 * check passed (fail-closed, see app/api/webhooks/polar/route.ts).
 *
 * Event semantics follow Polar's docs (polar.sh/docs/integrate/webhooks/events):
 *  - `order.paid`       → the actual money landed → applyPaymentEvent grants the plan.
 *  - `subscription.*`   → lifecycle bookkeeping: keep our Subscription row and
 *                         cancel_at_period_end in sync. Entitlement is NEVER
 *                         revoked here except on `subscription.revoked`.
 *  - `subscription.revoked` → entitlement ends (period-end cancel, immediate
 *                         revoke, or failed-payment dunning) → revert User to TRIAL.
 *  - `order.refunded`   → applyRefundEvent, deduped by the refund id.
 *
 * All event handling is idempotent (applyPaymentEvent/applyRefundEvent dedupe
 * by unique keys) so Polar's redeliveries are harmless.
 */

type PolarWebhookEvent = {
  id: string;
  type: string;
  timestamp?: string;
  data: PolarOrder | PolarSubscription | Record<string, unknown>;
};

function planFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Plan | null {
  const raw = metadata?.plan;
  if (raw === "PRO" || raw === "PREMIUM") return raw;
  return null;
}

function resolvePriceId(data: Record<string, unknown>): string | null {
  const raw = data.product_price_id;
  return typeof raw === "string" ? raw : null;
}

/**
 * The userId a paid order belongs to. Set at checkout creation in three
 * redundant ways — external_customer_id (Polar's user-reconciliation field),
 * metadata.userId, and the subscription's metadata — so any one of them
 * surviving to the webhook is enough.
 */
async function resolveOrderUserId(order: PolarOrder): Promise<string | null> {
  const customerExternalId =
    typeof order.customer?.external_id === "string" ? order.customer.external_id : null;
  const metadataUserId =
    typeof order.metadata?.userId === "string" ? (order.metadata.userId as string) : null;

  if (customerExternalId) return customerExternalId;
  if (metadataUserId) return metadataUserId;

  if (order.subscription_id) {
    try {
      const sub = await getPolarSubscription(order.subscription_id);
      const subUserId =
        typeof sub.metadata?.userId === "string" ? sub.metadata.userId : null;
      if (subUserId) return subUserId;
    } catch {
      // Logged by the caller; userId resolution failure fails closed.
    }
  }
  return null;
}

async function resolvePlan(order: PolarOrder): Promise<Plan | null> {
  // Entitlement is NOT price-amount based: the plan comes from the identity of
  // what was actually charged — the checkout metadata WE wrote at session
  // creation, cross-checked against the price id Polar recorded on the order.
  // Anything that isn't the currently-sold PRO rejects (fails closed): an
  // unknown plan, a PREMIUM price id (not-for-sale) or a mismatched price id.
  const metadataPlan = planFromMetadata(order.metadata);

  const priceId = resolvePriceId(order as unknown as Record<string, unknown>);
  const pricePlan = priceId ? polarPlanForPriceId(priceId) : null;

  let subPlan: Plan | null = null;
  let subPriceId: string | null = null;
  if (order.subscription_id) {
    // The subscription carries the checkout metadata — the most reliable tie-
    // breaker when the order itself lost it.
    const sub = await getPolarSubscription(order.subscription_id);
    subPlan = planFromMetadata(sub.metadata);
    subPriceId = resolvePriceId(sub as unknown as Record<string, unknown>);
  }

  // Candidate in trust order: our own checkout metadata, then the charged
  // price id, then the tied subscription's identity.
  const candidate = metadataPlan ?? pricePlan ?? subPlan ?? null;
  if (candidate !== "PRO") return null; // unknown/PREMIUM → reject, no grant

  // Identity cross-check: when Polar tells us an explicit price id (order or
  // subscription), it must map back to PRO (i.e. the configured PRO price id).
  // A wrong product/price that survives to the webhook is a reject.
  const chargedPriceId = priceId ?? subPriceId;
  if (chargedPriceId && polarPlanForPriceId(chargedPriceId) !== "PRO") return null;

  return "PRO";
}

/** How our free-text Subscription.status should mirror a Polar status. access
 * (User.plan) is NEVER decided here — that is applyPaymentEvent /
 * applyRefundEvent / the revocation handler's job. */
function targetSubscriptionStatus(sub: PolarSubscription): "ACTIVE" | "INACTIVE" {
  if (sub.status === "active" || sub.status === "past_due" || sub.status === "paused") {
    return "ACTIVE";
  }
  return "INACTIVE";
}

async function syncSubscriptionRecord(sub: PolarSubscription): Promise<void> {
  const plan =
    planFromMetadata(sub.metadata) ??
    (resolvePriceId(sub as unknown as Record<string, unknown>) &&
      polarPlanForPriceId(
        resolvePriceId(sub as unknown as Record<string, unknown>) as string,
      )) ??
    null;

  const userId = typeof sub.metadata?.userId === "string" ? sub.metadata.userId : null;
  if (!plan) return; // unresolvable plan → don't fabricate a row from guesswork
  if (!userId) return;

  await prisma.subscription.upsert({
    where: { externalId: sub.id },
    create: {
      userId,
      plan,
      status: targetSubscriptionStatus(sub),
      paymentProvider: "polar",
      externalId: sub.id,
      currentPeriodStart: sub.current_period_start
        ? new Date(sub.current_period_start)
        : null,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
      nextRenewalAt: sub.current_period_end ? new Date(sub.current_period_end) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      status: targetSubscriptionStatus(sub),
      currentPeriodStart: sub.current_period_start
        ? new Date(sub.current_period_start)
        : undefined,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end)
        : undefined,
      nextRenewalAt: sub.current_period_end
        ? new Date(sub.current_period_end)
        : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

async function handleOrderPaid(order: PolarOrder): Promise<void> {
  if (order.status !== "paid") return;

  const userId = await resolveOrderUserId(order);
  const plan = await resolvePlan(order);
  if (!userId || !plan) {
    throw new Error(
      `[polar-events] order.paid ${order.id} could not resolve ${!userId ? "userId" : "plan"} — refusing to grant blind`,
    );
  }

  await applyPaymentEvent({
    userId,
    amount: order.total_amount,
    currency: order.currency,
    provider: "polar",
    externalTransactionId: order.id,
    idempotencyKey: `polar:order:${order.id}`,
    status: "SUCCEEDED",
    plan,
    paidAt: order.paid_at ? new Date(order.paid_at) : new Date(),
    subscriptionExternalId: order.subscription_id ?? order.id,
  });
}

async function handleSubscriptionRevoked(sub: PolarSubscription): Promise<void> {
  // The webhook carries metadata.userId, but don't trust it as the ONLY source:
  // if Polar ever drops metadata we can still reconcile from our own
  // Subscription row (keyed on the stable externalId) — revocation must not
  // silently leak entitlement just because a payload lost a field.
  const webhookUserId =
    typeof sub.metadata?.userId === "string" ? sub.metadata.userId : null;

  const ours = await prisma.subscription.findFirst({
    where: { externalId: sub.id },
    select: { userId: true, plan: true, status: true },
  });

  const userId = webhookUserId ?? ours?.userId;
  const plan = ours?.plan ?? planFromMetadata(sub.metadata) ?? undefined;

  // Still cancel the row even if we can't find the owner (e.g. a revoked sub
  // we never synced) — the money side must be closed out either way.
  await prisma.subscription.updateMany({
    where: { externalId: sub.id },
    data: { status: "CANCELED", cancelAtPeriodEnd: false },
  });

  // Only revoke the entitlement if this is the user's still-CURRENT active
  // subscription (mirrors applyRefundEvent's guard) — revoking an old,
  // already-superseded subscription must not clip whatever they're on now.
  if (!userId || !plan) return;
  const currentActive = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { id: true, externalId: true },
  });
  if (currentActive?.externalId === sub.id) {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: "TRIAL", subscriptionStatus: "CANCELED" },
    });
  }
}

async function handleOrderRefunded(order: PolarOrder): Promise<void> {
  const status = order.status;
  if (status !== "refunded" && status !== "partially_refunded") return;

  const payment = await prisma.payment.findUnique({
    where: { externalTransactionId: order.id },
    select: { id: true, amount: true },
  });
  // A refund for an order we never recorded a payment for isn't ours to act on.
  if (!payment) return;

  // Polar does not embed refunds in the order webhook — fetch the authoritative
  // list so the refund amount/id stay exact (a partial refund must never be
  // recorded as the full payment amount). Fetched lists are newest-first.
  const fetchedRefunds =
    order.refunds && order.refunds.length > 0 ? null : await listPolarRefunds(order.id);
  const latestRefund = fetchedRefunds
    ? [...fetchedRefunds]
        .sort(
          (a, b) =>
            new Date(b.created_at ?? 0).valueOf() - new Date(a.created_at ?? 0).valueOf(),
        )
        .at(0)
    : order.refunds?.at(-1);
  // A partial refund only records the money returned — the customer still paid
  // for the current period, so entitlement must NOT be pulled. A full refund
  // (status "refunded") is a real cancellation and reverts access via
  // applyRefundEvent's entitlement revocation.
  await applyRefundEvent({
    paymentId: payment.id,
    amount: latestRefund?.amount ?? payment.amount,
    status: "SUCCEEDED",
    reason: latestRefund?.reason ?? undefined,
    provider: "polar",
    externalRefundId: latestRefund?.id ?? `polar:order:${order.id}`,
    revokeEntitlement: status !== "partially_refunded",
  });
}

export async function applyPolarWebhook(event: PolarWebhookEvent): Promise<void> {
  switch (event.type) {
    case "order.paid":
      await handleOrderPaid(event.data as PolarOrder);
      return;

    case "order.refunded":
      await handleOrderRefunded(event.data as PolarOrder);
      return;

    // Acknowledge-and-bookkeep events whose entitlement state is set elsewhere
    case "subscription.created":
    case "subscription.active":
    case "subscription.updated":
    case "subscription.uncanceled":
      await syncSubscriptionRecord(event.data as PolarSubscription);
      return;

    // End-of-period cancels arrive with status still `active` +
    // cancel_at_period_end=true; mirror that flag so the UI/flow that reads our
    // row behaves like the Toss cancelAtPeriodEnd path. No revocation yet.
    case "subscription.canceled":
      await syncSubscriptionRecord(event.data as PolarSubscription);
      return;

    case "subscription.past_due":
      // Entitlement stays granted during Polar's dunning + grace period; only
      // our period bookkeeping needs refreshing. The eventual cutoff arrives
      // as subscription.revoked.
      await syncSubscriptionRecord(event.data as PolarSubscription);
      return;

    case "subscription.revoked":
      await handleSubscriptionRevoked(event.data as PolarSubscription);
      return;

    case "checkout.created":
    case "checkout.updated":
    case "checkout.confirmed":
      // Checkout state alone never grants entitlement — the paid order does.
      return;

    default:
      return;
  }
}
