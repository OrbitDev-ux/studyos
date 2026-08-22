import "server-only";
import { prisma } from "@/lib/prisma";
import { PLAN_META } from "@/features/billing/plans";
import { applyPaymentEvent } from "@/features/billing/payment-service";
import { chargeBillingKey } from "@/features/billing/toss-client";

const GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RenewalRunSummary = {
  processed: number;
  charged: number;
  failed: number;
  canceled: number;
  expired: number;
};

/**
 * Daily reconciliation for recurring billing-key subscriptions. Toss's
 * billing-key API has no built-in scheduler (see toss-client.ts) — this
 * function IS the scheduler, meant to run once a day via Vercel Cron
 * (see app/api/cron/billing-renewals/route.ts).
 *
 * For every ACTIVE subscription whose currentPeriodEnd has passed, it either:
 *  - expires it (User.plan -> TRIAL) if cancelAtPeriodEnd was set — no charge
 *    attempted, mirroring an explicit user cancellation;
 *  - charges the next period and extends currentPeriodEnd (via
 *    applyPaymentEvent, which sets the new period from paidAt);
 *  - on a declined/failed charge, leaves the subscription ACTIVE-but-unpaid
 *    for GRACE_DAYS (retried on each subsequent run — see the idempotency
 *    key note below) before expiring it, tolerating a transiently declined
 *    card without an immediate hard cutoff.
 */
export async function runBillingRenewals(now: Date = new Date()): Promise<RenewalRunSummary> {
  const due = await prisma.subscription.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { lte: now } },
  });

  const summary: RenewalRunSummary = {
    processed: 0,
    charged: 0,
    failed: 0,
    canceled: 0,
    expired: 0,
  };

  for (const subscription of due) {
    summary.processed += 1;
    // Both are always set together by applyPaymentEvent — a row missing
    // either predates that invariant or is corrupt either way; skip rather
    // than crash the whole run over one bad row.
    if (!subscription.userId || !subscription.externalId) continue;

    if (subscription.cancelAtPeriodEnd) {
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELED" },
        }),
        prisma.user.update({
          where: { id: subscription.userId },
          data: { plan: "TRIAL", subscriptionStatus: "CANCELED" },
        }),
      ]);
      summary.canceled += 1;
      continue;
    }

    const periodEnd = subscription.currentPeriodEnd ?? now;
    const overdueDays = (now.getTime() - periodEnd.getTime()) / DAY_MS;

    try {
      const amount = PLAN_META[subscription.plan].priceKrw;
      // Keyed on TODAY (not the stale periodEnd), so each calendar day this
      // job runs is a genuinely new charge attempt at Toss — a same-day
      // idempotency key would make a retry after a declined card just replay
      // the cached decline instead of re-attempting the charge.
      const cycleKey = now.toISOString().slice(0, 10);
      const idempotencyKey = `renewal:${subscription.id}:${cycleKey}`;
      const orderId = `renewal-${subscription.id}-${cycleKey}`.slice(0, 64);

      const charge = await chargeBillingKey({
        billingKey: subscription.externalId,
        customerKey: subscription.userId,
        amount,
        orderId,
        orderName: `StudyOS ${PLAN_META[subscription.plan].name} 갱신`,
        idempotencyKey,
      });

      if (charge.status !== "DONE") throw new Error(`unexpected charge status ${charge.status}`);

      await applyPaymentEvent({
        userId: subscription.userId,
        amount: charge.totalAmount,
        currency: "KRW",
        provider: "toss",
        externalTransactionId: charge.paymentKey,
        idempotencyKey,
        status: "SUCCEEDED",
        plan: subscription.plan,
        paidAt: charge.approvedAt ? new Date(charge.approvedAt) : now,
        subscriptionExternalId: subscription.externalId,
      });
      summary.charged += 1;
    } catch (error) {
      console.error(`[billing/renewal] charge failed for subscription ${subscription.id}`, error);
      if (overdueDays > GRACE_DAYS) {
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "EXPIRED" },
          }),
          prisma.user.update({
            where: { id: subscription.userId },
            data: { plan: "TRIAL", subscriptionStatus: "EXPIRED" },
          }),
        ]);
        summary.expired += 1;
      } else {
        // Left ACTIVE with a still-past currentPeriodEnd, so this same
        // subscription is picked up again on tomorrow's run — retried daily
        // until GRACE_DAYS is exceeded above.
        summary.failed += 1;
      }
    }
  }

  return summary;
}
