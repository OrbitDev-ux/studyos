import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for a Critical audit finding: applyPaymentEvent/
 * applyRefundEvent used to only write Payment/Subscription/Refund rows and
 * never touched User.plan — but entitlements are resolved entirely from
 * User.plan/subscriptionStatus (see subscription.ts's effectivePlan), so a
 * successful payment never actually upgraded anyone, and a refund never
 * revoked access. Uses the codebase's callback-style
 * `prisma.$transaction(async (tx) => ...)` mocking convention (see
 * mock-exam/submit-exam.test.ts).
 */
vi.mock("server-only", () => ({}));

const { payment, user, subscription, refund, transaction } = vi.hoisted(() => {
  const payment = { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() };
  const user = { update: vi.fn() };
  const subscription = { upsert: vi.fn(), update: vi.fn() };
  const refund = { create: vi.fn() };
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

import { applyPaymentEvent, applyRefundEvent } from "@/features/billing/payment-service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyPaymentEvent", () => {
  it("upgrades User.plan/subscriptionStatus on a SUCCEEDED payment with a plan", async () => {
    payment.upsert.mockResolvedValue({ id: "pay-1", status: "PENDING" });
    payment.update.mockResolvedValue({ id: "pay-1", status: "SUCCEEDED" });
    subscription.upsert.mockResolvedValue({});

    await applyPaymentEvent({
      userId: "user-1",
      amount: 9900,
      provider: "test-pg",
      externalTransactionId: "tx-1",
      idempotencyKey: "idem-1",
      status: "SUCCEEDED",
      plan: "PRO",
    });

    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "PRO", subscriptionStatus: "ACTIVE" },
    });
  });

  it("does not touch User when the payment has no plan (e.g. a non-plan charge)", async () => {
    payment.upsert.mockResolvedValue({ id: "pay-2", status: "PENDING" });
    payment.update.mockResolvedValue({ id: "pay-2", status: "SUCCEEDED" });

    await applyPaymentEvent({
      userId: "user-2",
      amount: 9900,
      provider: "test-pg",
      externalTransactionId: "tx-2",
      idempotencyKey: "idem-2",
      status: "SUCCEEDED",
    });

    expect(user.update).not.toHaveBeenCalled();
  });
});

describe("applyRefundEvent", () => {
  it("reverts the payer's plan to TRIAL and cancels the subscription on a SUCCEEDED refund", async () => {
    refund.create.mockResolvedValue({ id: "refund-1" });
    payment.findUnique.mockResolvedValue({ userId: "user-1", subscriptionId: "sub-1" });

    await applyRefundEvent({
      paymentId: "pay-1",
      amount: 9900,
      status: "SUCCEEDED",
    });

    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "TRIAL", subscriptionStatus: "CANCELED" },
    });
    expect(subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "CANCELED" },
    });
  });

  it("does not touch User/Subscription for a refund that hasn't completed yet", async () => {
    refund.create.mockResolvedValue({ id: "refund-2" });

    await applyRefundEvent({
      paymentId: "pay-2",
      amount: 9900,
      status: "PENDING",
    });

    expect(payment.findUnique).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
    expect(subscription.update).not.toHaveBeenCalled();
  });
});
