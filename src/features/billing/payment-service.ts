import "server-only";

import { prisma } from "@/lib/prisma";
import type { Plan, SubscriptionStatus } from "@/generated/prisma/client";

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
      await tx.subscription.upsert({
        where: { externalId: input.externalTransactionId },
        create: {
          userId: input.userId,
          plan: input.plan,
          status: "ACTIVE" satisfies SubscriptionStatus,
          paymentProvider: input.provider,
          externalId: input.externalTransactionId,
        },
        update: { status: "ACTIVE", plan: input.plan },
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
