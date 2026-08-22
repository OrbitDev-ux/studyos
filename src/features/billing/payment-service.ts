import "server-only";

import { prisma } from "@/lib/prisma";
import type { Plan, SubscriptionStatus } from "@/generated/prisma/client";
import { addOneMonthClamped } from "@/features/billing/period";

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

/** Idempotent internal webhook application point for a future verified PG
 * webhook. This function must only be called after signature verification. */
export async function applyPaymentEvent(input: PaymentEvent) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        userId: input.userId,
        amount: input.amount,
        currency: input.currency ?? "KRW",
        paymentProvider: input.provider,
        externalTransactionId: input.externalTransactionId,
        idempotencyKey: input.idempotencyKey,
        status: input.status,
        paidAt: input.paidAt ?? (input.status === "SUCCEEDED" ? new Date() : null),
      },
      update: {},
    });

    if (payment.status === input.status) return payment;
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { status: input.status, paidAt: input.paidAt ?? payment.paidAt },
    });

    if (input.status === "SUCCEEDED" && input.plan) {
      const paidAt = input.paidAt ?? updated.paidAt ?? new Date();
      const periodEnd = addOneMonthClamped(paidAt);
      const subExternalId = input.subscriptionExternalId ?? input.externalTransactionId;

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
      await tx.payment.update({
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
    }
    return updated;
  });
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
      if (payment?.userId) {
        await tx.user.update({
          where: { id: payment.userId },
          data: { plan: "TRIAL", subscriptionStatus: "CANCELED" satisfies SubscriptionStatus },
        });
      }
      if (payment?.subscriptionId) {
        await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: { status: "CANCELED" },
        });
      }
    }

    return refund;
  });
}
