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
  return prisma.refund.create({
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
}
