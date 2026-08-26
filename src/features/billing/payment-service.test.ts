import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for a Critical audit finding: applyPaymentEvent used a
 * plain `upsert` + "does the returned status match the input?" check to
 * decide whether to grant entitlement. On a BRAND NEW idempotencyKey (every
 * real checkout/renewal call), `create` writes the row already at its final
 * status, so that comparison was trivially true and the function returned
 * before ever touching Subscription/User — every real payment charged the
 * user and never upgraded them. The fix distinguishes "this Payment row was
 * just created" from "this Payment row already existed with this exact
 * status" using findUnique + create instead of upsert, and only skips the
 * entitlement grant in the latter case.
 *
 * Uses the codebase's callback-style `prisma.$transaction(async (tx) => ...)`
 * mocking convention (see mock-exam/submit-exam.test.ts).
 */
vi.mock("server-only", () => ({}));

const { deleteBillingKey } = vi.hoisted(() => ({ deleteBillingKey: vi.fn() }));
vi.mock("@/features/billing/toss-client", () => ({ deleteBillingKey }));

const { payment, user, subscription, refund, transaction } = vi.hoisted(() => {
  const payment = {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const user = { update: vi.fn() };
  const subscription = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };
  const refund = { findUnique: vi.fn(), create: vi.fn() };
  return {
    payment,
    user,
    subscription,
    refund,
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({ payment, user, subscription, refund }),
    ),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));

import { Prisma } from "@/generated/prisma/client";
import { applyPaymentEvent, applyRefundEvent } from "@/features/billing/payment-service";

function duplicateIdempotencyKeyError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.0.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  subscription.findMany.mockResolvedValue([]);
  subscription.updateMany.mockResolvedValue({ count: 0 });
  deleteBillingKey.mockResolvedValue(undefined);
});

const BASE_EVENT = {
  userId: "user-1",
  amount: 4900,
  provider: "toss",
  externalTransactionId: "tx-1",
  idempotencyKey: "first:abc",
  status: "SUCCEEDED",
  plan: "PRO" as const,
  subscriptionExternalId: "billing-key-1",
};

describe("applyPaymentEvent — new event (fresh idempotencyKey)", () => {
  it("grants entitlement immediately on a brand-new SUCCEEDED payment with a plan", async () => {
    payment.findUnique.mockResolvedValue(null); // never seen this idempotencyKey before
    payment.create.mockResolvedValue({ id: "pay-1", status: "SUCCEEDED", paidAt: new Date() });
    payment.update.mockResolvedValue({ id: "pay-1", status: "SUCCEEDED" });
    subscription.upsert.mockResolvedValue({ id: "sub-1" });

    await applyPaymentEvent(BASE_EVENT);

    expect(payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          idempotencyKey: "first:abc",
          status: "SUCCEEDED",
        }),
      }),
    );
    expect(subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalId: "billing-key-1" },
        create: expect.objectContaining({ userId: "user-1", plan: "PRO", status: "ACTIVE" }),
      }),
    );
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "PRO", subscriptionStatus: "ACTIVE" },
    });
  });

  it("does not grant entitlement for a brand-new FAILED payment", async () => {
    payment.findUnique.mockResolvedValue(null);
    payment.create.mockResolvedValue({ id: "pay-2", status: "FAILED", paidAt: null });

    await applyPaymentEvent({ ...BASE_EVENT, idempotencyKey: "first:def", status: "FAILED" });

    expect(subscription.upsert).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });

  it("does not touch User when the payment has no plan (e.g. a non-plan charge)", async () => {
    payment.findUnique.mockResolvedValue(null);
    payment.create.mockResolvedValue({ id: "pay-3", status: "SUCCEEDED", paidAt: new Date() });

    await applyPaymentEvent({
      userId: BASE_EVENT.userId,
      amount: BASE_EVENT.amount,
      provider: BASE_EVENT.provider,
      externalTransactionId: BASE_EVENT.externalTransactionId,
      idempotencyKey: "first:ghi",
      status: BASE_EVENT.status,
    });

    expect(user.update).not.toHaveBeenCalled();
  });

  it("cancels any other active subscription for the same user before activating the new one", async () => {
    payment.findUnique.mockResolvedValue(null);
    payment.create.mockResolvedValue({ id: "pay-4", status: "SUCCEEDED", paidAt: new Date() });
    payment.update.mockResolvedValue({ id: "pay-4", status: "SUCCEEDED" });
    subscription.findMany.mockResolvedValue([{ id: "sub-old", externalId: "old-billing-key" }]);
    subscription.upsert.mockResolvedValue({ id: "sub-new" });

    await applyPaymentEvent(BASE_EVENT); // upgrading to a new billing key "billing-key-1"

    expect(subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: "ACTIVE", NOT: { externalId: "billing-key-1" } },
      }),
    );
    expect(subscription.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["sub-old"] } },
      data: { status: "CANCELED", cancelAtPeriodEnd: false },
    });
    // Toss cleanup for the superseded billing key is best-effort, outside the
    // transaction, and must never block the entitlement grant.
    expect(deleteBillingKey).toHaveBeenCalledWith("old-billing-key");
  });

  it("survives a concurrent create race for the same idempotencyKey without double-granting", async () => {
    // Two calls both see no existing row, both attempt to create — the loser
    // hits the unique constraint on idempotencyKey and must fall back to
    // reading what the winner already committed, not throw or re-grant.
    payment.findUnique.mockResolvedValue(null);
    payment.create.mockRejectedValue(duplicateIdempotencyKeyError());
    payment.findUniqueOrThrow.mockResolvedValue({ id: "pay-1", status: "SUCCEEDED", paidAt: new Date() });

    await applyPaymentEvent(BASE_EVENT);

    expect(payment.findUniqueOrThrow).toHaveBeenCalledWith({ where: { idempotencyKey: "first:abc" } });
    // The winner already granted entitlement for this event; the loser sees
    // status already equal to the input and must not grant it a second time.
    expect(subscription.upsert).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });
});

describe("applyPaymentEvent — redelivered event (idempotencyKey already on file)", () => {
  it("is a pure no-op when the redelivered event's status matches what's already stored", async () => {
    payment.findUnique.mockResolvedValue({ id: "pay-1", status: "SUCCEEDED", paidAt: new Date() });

    await applyPaymentEvent(BASE_EVENT);

    expect(payment.create).not.toHaveBeenCalled();
    expect(payment.update).not.toHaveBeenCalled();
    expect(subscription.upsert).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });

  it("grants entitlement on a genuine PENDING -> SUCCEEDED status transition", async () => {
    payment.findUnique.mockResolvedValue({ id: "pay-1", status: "PENDING", paidAt: null });
    payment.update.mockResolvedValue({ id: "pay-1", status: "SUCCEEDED", paidAt: new Date() });
    subscription.upsert.mockResolvedValue({ id: "sub-1" });

    await applyPaymentEvent(BASE_EVENT);

    expect(payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "pay-1" }, data: expect.objectContaining({ status: "SUCCEEDED" }) }),
    );
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "PRO", subscriptionStatus: "ACTIVE" },
    });
  });
});

describe("applyRefundEvent", () => {
  it("reverts the payer's plan to TRIAL and cancels the subscription when it's still the active one", async () => {
    refund.create.mockResolvedValue({ id: "refund-1" });
    payment.findUnique.mockResolvedValue({ userId: "user-1", subscriptionId: "sub-1" });
    subscription.findFirst.mockResolvedValue({ id: "sub-1" }); // sub-1 IS the current active one

    await applyRefundEvent({ paymentId: "pay-1", amount: 9900, status: "SUCCEEDED" });

    expect(subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "CANCELED" },
    });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "TRIAL", subscriptionStatus: "CANCELED" },
    });
  });

  it("does not touch the user's current plan when refunding an old, already-superseded subscription", async () => {
    refund.create.mockResolvedValue({ id: "refund-2" });
    payment.findUnique.mockResolvedValue({ userId: "user-1", subscriptionId: "sub-old" });
    // The user has since upgraded — sub-new, not sub-old, is what's active now.
    subscription.findFirst.mockResolvedValue({ id: "sub-new" });

    await applyRefundEvent({ paymentId: "pay-2", amount: 4900, status: "SUCCEEDED" });

    expect(user.update).not.toHaveBeenCalled();
  });

  it("does not touch User/Subscription for a refund that hasn't completed yet", async () => {
    refund.create.mockResolvedValue({ id: "refund-3" });

    await applyRefundEvent({ paymentId: "pay-3", amount: 9900, status: "PENDING" });

    expect(payment.findUnique).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });

  it("is a no-op when the same externalRefundId has already been recorded (duplicate webhook redelivery)", async () => {
    refund.findUnique.mockResolvedValue({ id: "refund-1" });

    const result = await applyRefundEvent({
      paymentId: "pay-1",
      amount: 9900,
      status: "SUCCEEDED",
      externalRefundId: "toss-cancel-1",
    });

    expect(result).toEqual({ id: "refund-1" });
    expect(refund.create).not.toHaveBeenCalled();
    expect(payment.findUnique).not.toHaveBeenCalled();
  });
});
