import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { Payment, Plan, SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { addOneMonthClamped } from "@/features/billing/period";
import { deleteBillingKey } from "@/features/billing/toss-client";

type PaymentEvent = {
  userId: string;
  amount: number;
  currency?: string;
  provider: string;
  externalTransactionId: string;
  idempotencyKey: string;
  status: string;
  plan?: Plan;
  paidAt?: Date;
  /** Stable subscription-level identifier (e.g. a recurring billing key) —
   * distinct from externalTransactionId, which is per-charge and changes on
   * every renewal. Falls back to externalTransactionId for one-off callers,
   * matching the original (pre-recurring) behavior. */
  subscriptionExternalId?: string;
};

/** Creates a pending record only. It does not call a PG or grant Plus access. */
export async function createPendingPayment(input: {
  userId: string;
  amount: number;
  currency?: string;
  provider: string;
  idempotencyKey: string;
}) {
  return prisma.payment.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      userId: input.userId,
      amount: input.amount,
      currency: input.currency ?? "KRW",
      paymentProvider: input.provider,
      idempotencyKey: input.idempotencyKey,
      status: "PENDING",
    },
    update: {},
  });
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Idempotent application point for a verified payment result (the checkout
 * callback's first charge, or the renewal cron's recurring charge — both
 * pass a fresh idempotencyKey per real-world charge attempt, see their own
 * files for how it's derived).
 *
 * This has to tell apart two situations that look similar but must be
 * handled differently:
 *  - a BRAND NEW idempotencyKey (the first time this exact charge has ever
 *    been seen) — a SUCCEEDED event with a plan must grant entitlement
 *    immediately. There is no earlier PENDING row whose transition would
 *    otherwise trigger it.
 *  - a REDELIVERED event for an idempotencyKey already on file (e.g. a
 *    duplicated webhook, or a future PENDING -> SUCCEEDED flow seeded by
 *    createPendingPayment) — only reacts when the stored status is actually
 *    changing; a pure repeat is a no-op.
 *
 * A single `upsert` plus "does the row's status match the input?" can't
 * distinguish these: on a fresh key, `create` writes the row already at its
 * final status, so that comparison is trivially true and the function
 * returned before ever granting entitlement — every real payment charged
 * the user and never upgraded them. See payment-service.test.ts.
 */
export async function applyPaymentEvent(input: PaymentEvent) {
  const { payment, staleBillingKeys } = await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    let payment: Payment;
    let isNewEvent: boolean;

    if (existing) {
      payment = existing;
      isNewEvent = false;
    } else {
      try {
        payment = await tx.payment.create({
          data: {
            userId: input.userId,
            amount: input.amount,
            currency: input.currency ?? "KRW",
            paymentProvider: input.provider,
            externalTransactionId: input.externalTransactionId,
            idempotencyKey: input.idempotencyKey,
            status: input.status,
            paidAt: input.paidAt ?? (input.status === "SUCCEEDED" ? new Date() : null),
          },
        });
        isNewEvent = true;
      } catch (err) {
        // Lost a race against a concurrent call for the same idempotencyKey
        // (e.g. a duplicated webhook delivery landing alongside the callback
        // route) — someone else just created it, so treat this call as a
        // redelivery of an already-recorded event instead of erroring.
        if (!isUniqueConstraintError(err)) throw err;
        payment = await tx.payment.findUniqueOrThrow({
          where: { idempotencyKey: input.idempotencyKey },
        });
        isNewEvent = false;
      }
    }

    if (!isNewEvent) {
      // Already-processed redelivery of the same result — no-op.
      if (payment.status === input.status) return { payment, staleBillingKeys: [] as string[] };
      payment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: input.status, paidAt: input.paidAt ?? payment.paidAt },
      });
    }

    let staleBillingKeys: string[] = [];

    if (input.status === "SUCCEEDED" && input.plan) {
      const paidAt = input.paidAt ?? payment.paidAt ?? new Date();
      const periodEnd = addOneMonthClamped(paidAt);
      const subExternalId = input.subscriptionExternalId ?? input.externalTransactionId;

      // Guarantee at most one ACTIVE subscription per user: cancel every
      // other active subscription BEFORE activating this one — order matters,
      // since the DB-level partial unique index on Subscription(userId)
      // WHERE status='ACTIVE' (see migration
      // 20260826120000_subscription_single_active) checks each statement
      // immediately rather than deferring to commit. Without this, a plan
      // upgrade (PRO -> PREMIUM) would leave the old subscription ACTIVE
      // alongside the new one, and both would be charged on every renewal.
      const staleActive = await tx.subscription.findMany({
        where: { userId: input.userId, status: "ACTIVE", NOT: { externalId: subExternalId } },
        select: { id: true, externalId: true },
      });
      if (staleActive.length > 0) {
        await tx.subscription.updateMany({
          where: { id: { in: staleActive.map((s) => s.id) } },
          data: { status: "CANCELED", cancelAtPeriodEnd: false },
        });
      }

      const subscription = await tx.subscription.upsert({
        where: { externalId: subExternalId },
        create: {
          userId: input.userId,
          plan: input.plan,
          status: "ACTIVE" satisfies SubscriptionStatus,
          paymentProvider: input.provider,
          externalId: subExternalId,
          currentPeriodStart: paidAt,
          currentPeriodEnd: periodEnd,
          nextRenewalAt: periodEnd,
        },
        update: {
          status: "ACTIVE",
          plan: input.plan,
          currentPeriodStart: paidAt,
          currentPeriodEnd: periodEnd,
          nextRenewalAt: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      // Link this charge's Payment row to its Subscription — the renewal cron
      // and refund flow both look payments up via subscriptionId.
      payment = await tx.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id },
      });

      // Entitlements are resolved entirely from User.plan/subscriptionStatus
      // (see billing/subscription.ts's effectivePlan/resolveAccessState) —
      // the Subscription row above is a billing record, not what gates
      // feature access. Without this, a successful payment would be recorded
      // but never actually upgrade the user.
      await tx.user.update({
        where: { id: input.userId },
        data: {
          plan: input.plan,
          subscriptionStatus: "ACTIVE" satisfies SubscriptionStatus,
        },
      });

      staleBillingKeys = staleActive
        .map((s) => s.externalId)
        .filter((id): id is string => Boolean(id));
    }

    return { payment, staleBillingKeys };
  });

  // Best-effort, outside the DB transaction: tell Toss the superseded billing
  // key(s) are no longer needed. Never blocks the entitlement grant above — a
  // failure here just leaves an unused registration at Toss, which StudyOS
  // will never charge again since the renewal cron only bills ACTIVE
  // subscriptions.
  for (const billingKey of staleBillingKeys) {
    deleteBillingKey(billingKey).catch(() => {});
  }

  return payment;
}

export async function applyRefundEvent(input: {
  paymentId: string;
  amount: number;
  status: string;
  reason?: string;
  provider?: string;
  externalRefundId?: string;
  processedAt?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    // Toss (and PGs generally) can redeliver the same webhook notification —
    // without this guard, a redelivered CANCEL_STATUS_CHANGED would create a
    // second Refund row and re-run the entitlement revert. externalRefundId
    // is the PG's own unique id for this specific cancellation, so an exact
    // match means we've already recorded it.
    if (input.externalRefundId) {
      const already = await tx.refund.findUnique({
        where: { externalRefundId: input.externalRefundId },
      });
      if (already) return already;
    }

    const refund = await tx.refund.create({
      data: {
        paymentId: input.paymentId,
        amount: input.amount,
        status: input.status,
        reason: input.reason,
        paymentProvider: input.provider,
        externalRefundId: input.externalRefundId,
        processedAt: input.processedAt,
      },
    });

    // Mirror the payment-success side: a completed refund must revoke the
    // entitlement it granted, not just record itself. Without this, a fully
    // refunded payment leaves the user's paid access in place indefinitely.
    // Simplification: reverts straight to TRIAL rather than any prior paid
    // tier — this app has no plan-upgrade-history model yet to fall back to.
    if (input.status === "SUCCEEDED") {
      const payment = await tx.payment.findUnique({
        where: { id: input.paymentId },
        select: { userId: true, subscriptionId: true },
      });

      if (payment?.subscriptionId) {
        // Only revoke the user's CURRENT entitlement if the refunded charge
        // belongs to their still-active subscription — refunding an old,
        // already-superseded subscription's payment (e.g. a past PRO period
        // from before they upgraded to PREMIUM) must not touch whatever plan
        // they're actually on now.
        const currentActive = payment.userId
          ? await tx.subscription.findFirst({
              where: { userId: payment.userId, status: "ACTIVE" },
              select: { id: true },
            })
          : null;

        await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: { status: "CANCELED" },
        });

        if (payment.userId && currentActive?.id === payment.subscriptionId) {
          await tx.user.update({
            where: { id: payment.userId },
            data: { plan: "TRIAL", subscriptionStatus: "CANCELED" satisfies SubscriptionStatus },
          });
        }
      }
    }

    return refund;
  });
}
