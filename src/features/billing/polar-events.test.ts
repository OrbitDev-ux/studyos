import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * applyPolarWebhook entitlement policy (LAUNCH: PRO $9.99 / month is the only
 * sold plan). Entitlement is decided by identity, never by amount:
 *  - order.paid grants ONLY when the resolved plan is PRO and the price id
 *    Polar recorded maps back to PRO (wrong product/price → reject).
 *  - PREMIUM (not-for-sale) and unknown plans never grant — the handler
 *    throws so the webhook 500s and Polar retries (never a silent drop).
 *  - The customer identity comes from external_customer_id / subscription
 *    metadata, NOT from wildcard order.metadata (account A's order can never
 *    grant account B).
 * `polarPlanForPriceId` is exercised for REAL (env-driven), so the identity
 * cross-check is measured, not mocked.
 */
vi.mock("server-only", () => ({}));

const {
  prisma,
  payment,
  user,
  subscription,
  applyPaymentEvent,
  applyRefundEvent,
  getPolarSubscription,
} = vi.hoisted(() => {
  const payment = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const user = { update: vi.fn() };
  const subscription = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
  };
  const applyPaymentEvent = vi.fn();
  const applyRefundEvent = vi.fn();
  const getPolarSubscription = vi.fn();
  return {
    prisma: { payment, user, subscription },
    payment,
    user,
    subscription,
    applyPaymentEvent,
    applyRefundEvent,
    getPolarSubscription,
  };
});
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/features/billing/payment-service", () => ({
  applyPaymentEvent,
  applyRefundEvent,
}));
vi.mock("@/features/billing/polar-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/billing/polar-client")>();
  return { ...actual, getPolarSubscription };
});

import { applyPolarWebhook } from "@/features/billing/polar-events";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("POLAR_PRO_PRICE_ID", "price_pro");
  vi.stubEnv("POLAR_PREMIUM_PRICE_ID", "price_premium");
  vi.stubEnv("POLAR_TOKEN", "t");
  applyPaymentEvent.mockResolvedValue(undefined);
  getPolarSubscription.mockRejectedValue(new Error("no sub"));
  subscription.findFirst.mockResolvedValue(null);
  applyRefundEvent.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** order.paid webhook payload shaped like Polar's data object. */
function orderPaidEvent(order: Record<string, unknown>) {
  return { id: "evt_1", type: "order.paid", data: { id: "ord_1", ...order } };
}

describe("order.paid → resolvePlan (entitlement by identity, PRO-only)", () => {
  const baseOrder = {
    status: "paid",
    total_amount: 999,
    currency: "usd",
    product_price_id: "price_pro",
    customer: { id: "cus_1", external_id: "user-1" },
    metadata: { plan: "PRO", userId: "user-1" },
  };

  it("grants PRO when checkout metadata + charged price id both say PRO", async () => {
    await applyPolarWebhook(orderPaidEvent(baseOrder));

    expect(applyPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        amount: 999,
        currency: "usd",
        provider: "polar",
        plan: "PRO",
        externalTransactionId: "ord_1",
      }),
    );
  });

  it("rejects PREMIUM — not-for-sale — even with a signed, fully consist-ent PREMIUM order", async () => {
    await expect(
      applyPolarWebhook(
        orderPaidEvent({
          ...baseOrder,
          product_price_id: "price_premium",
          metadata: { plan: "PREMIUM", userId: "user-1" },
        }),
      ),
    ).rejects.toThrow(/plan/);
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("rejects a PRO metadata claim backed by a PREMIUM price id (identity mismatch)", async () => {
    await expect(
      applyPolarWebhook(
        orderPaidEvent({ ...baseOrder, product_price_id: "price_premium" }),
      ),
    ).rejects.toThrow(/plan/);
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("rejects a PRO metadata claim backed by an unknown (wrong-product) price id", async () => {
    await expect(
      applyPolarWebhook(
        orderPaidEvent({ ...baseOrder, product_price_id: "price_unknown" }),
      ),
    ).rejects.toThrow(/plan/);
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("rejects a valid PRO price id when the metadata explicitly asks for PREMIUM", async () => {
    await expect(
      applyPolarWebhook(
        orderPaidEvent({ ...baseOrder, metadata: { plan: "PREMIUM", userId: "user-1" } }),
      ),
    ).rejects.toThrow(/plan/);
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("grants the external_customer_id owner, never a spoofed metadata.userId (account A can't grant B)", async () => {
    // An attacker crafts metadata.userId="hacker-B"; the authoritative owner
    // comes from external_customer_id = "user-1" and wins.
    await applyPolarWebhook(
      orderPaidEvent({ ...baseOrder, metadata: { plan: "PRO", userId: "hacker-B" } }),
    );

    expect(applyPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
    );
    expect(applyPaymentEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: "hacker-B" }),
    );
  });

  it("rejects a signed PRO order whose owner (external_customer_id) cannot be resolved to anyone", async () => {
    await expect(
      applyPolarWebhook(
        orderPaidEvent({
          ...baseOrder,
          customer: { id: "cus_1", external_id: null },
          metadata: {},
          subscription_id: null,
        }),
      ),
    ).rejects.toThrow(/userId/);
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("falls back to the subscription's userId only after order identity is exhausted", async () => {
    getPolarSubscription.mockResolvedValue({
      id: "sub_1",
      status: "active",
      cancel_at_period_end: false,
      metadata: { userId: "sub-owner", plan: "PRO" },
      product_price_id: "price_pro",
    });

    await applyPolarWebhook(
      orderPaidEvent({
        ...baseOrder,
        customer: { id: "cus_1", external_id: null },
        metadata: {},
        subscription_id: "sub_1",
        product_price_id: null,
      }),
    );

    expect(applyPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "sub-owner", plan: "PRO" }),
    );
  });
});

describe("order.refunded", () => {
  it("records a full refund against the stored payment (identity from our own row)", async () => {
    payment.findUnique.mockResolvedValue({ id: "pay-1", amount: 999 });
    // No embedded refunds list → falls back to the real listPolarRefunds (fetch
    // mocked here) so the recorded refund amount/id stay exact.

    const refundSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ id: "RF_1", amount: 999, created_at: "2026-09-22T00:00:00Z" }],
        }),
        { status: 200 },
      ),
    );

    await applyPolarWebhook({
      id: "evt_2",
      type: "order.refunded",
      data: { id: "ord_1", status: "refunded", total_amount: 999, currency: "usd" },
    });

    refundSpy.mockRestore();
    expect(applyRefundEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "pay-1",
        amount: 999,
        revokeEntitlement: true,
        externalRefundId: "RF_1",
      }),
    );
  });

  it("records a partial refund with revokeEntitlement=false (money back, access stays)", async () => {
    payment.findUnique.mockResolvedValue({ id: "pay-1", amount: 999 });

    await applyPolarWebhook({
      id: "evt_5",
      type: "order.refunded",
      data: {
        id: "ord_1",
        status: "partially_refunded",
        total_amount: 999,
        currency: "usd",
        refunds: [{ id: "RF_p", amount: 300, reason: "partial" }],
      },
    });

    expect(applyRefundEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "pay-1",
        amount: 300,
        revokeEntitlement: false,
        externalRefundId: "RF_p",
      }),
    );
  });
});

describe("subscription.revoked", () => {
  it("revokes entitlement only when the revoked sub is the user's current ACTIVE one", async () => {
    subscription.findFirst.mockResolvedValue({
      id: "sub-1",
      externalId: "sub_ex",
      userId: "user-1",
      plan: "PRO",
      status: "ACTIVE",
    });

    await applyPolarWebhook({
      id: "evt_3",
      type: "subscription.revoked",
      data: {
        id: "sub_ex",
        status: "revoked",
        cancel_at_period_end: false,
        metadata: { userId: "user-1", plan: "PRO" },
      },
    });

    expect(subscription.updateMany).toHaveBeenCalledWith({
      where: { externalId: "sub_ex" },
      data: { status: "CANCELED", cancelAtPeriodEnd: false },
    });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "TRIAL", subscriptionStatus: "CANCELED" },
    });
  });

  it("closes out the row without touching the user when the revoked sub is already superseded", async () => {
    subscription.findFirst.mockResolvedValue({
      id: "sub-old",
      externalId: "sub_ex_old",
      userId: "user-1",
      plan: "PRO",
      status: "ACTIVE",
    });

    await applyPolarWebhook({
      id: "evt_4",
      type: "subscription.revoked",
      data: {
        id: "sub_ex_unknown",
        status: "revoked",
        cancel_at_period_end: false,
        metadata: { userId: "user-1", plan: "PRO" },
      },
    });

    expect(subscription.updateMany).toHaveBeenCalledWith({
      where: { externalId: "sub_ex_unknown" },
      data: { status: "CANCELED", cancelAtPeriodEnd: false },
    });
    // currentActive?.externalId (sub_ex_old) !== revoked (sub_ex_unknown) → no revert
    expect(user.update).not.toHaveBeenCalled();
  });
});
