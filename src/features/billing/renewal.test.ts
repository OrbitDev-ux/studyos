import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { subscription, user, transaction } = vi.hoisted(() => {
  const subscription = { findMany: vi.fn(), update: vi.fn() };
  const user = { update: vi.fn() };
  return {
    subscription,
    user,
    transaction: vi.fn(async (arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as () => unknown)(),
    ),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { subscription, user, $transaction: transaction } }));

const { chargeBillingKey } = vi.hoisted(() => ({ chargeBillingKey: vi.fn() }));
vi.mock("@/features/billing/toss-client", () => ({ chargeBillingKey }));

const { applyPaymentEvent } = vi.hoisted(() => ({ applyPaymentEvent: vi.fn() }));
vi.mock("@/features/billing/payment-service", () => ({ applyPaymentEvent }));

import { runBillingRenewals } from "@/features/billing/renewal";

const NOW = new Date("2026-03-10T00:00:00Z");

function dueSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub-1",
    userId: "user-1",
    externalId: "billing-key-1",
    plan: "PRO" as const,
    status: "ACTIVE",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: new Date("2026-03-09T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  subscription.update.mockResolvedValue({});
  user.update.mockResolvedValue({});
});

describe("runBillingRenewals", () => {
  it("expires a subscription flagged cancelAtPeriodEnd without charging", async () => {
    subscription.findMany.mockResolvedValue([dueSubscription({ cancelAtPeriodEnd: true })]);

    const summary = await runBillingRenewals(NOW);

    expect(chargeBillingKey).not.toHaveBeenCalled();
    expect(subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "CANCELED" },
    });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "TRIAL", subscriptionStatus: "CANCELED" },
    });
    expect(summary.canceled).toBe(1);
    expect(summary.charged).toBe(0);
  });

  it("charges the next period and applies the payment on success", async () => {
    subscription.findMany.mockResolvedValue([dueSubscription()]);
    chargeBillingKey.mockResolvedValue({
      paymentKey: "pay-1",
      status: "DONE",
      totalAmount: 4900,
      approvedAt: "2026-03-10T00:05:00Z",
    });
    applyPaymentEvent.mockResolvedValue({});

    const summary = await runBillingRenewals(NOW);

    expect(chargeBillingKey).toHaveBeenCalledWith(
      expect.objectContaining({ billingKey: "billing-key-1", customerKey: "user-1", amount: 4900 }),
    );
    expect(applyPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        plan: "PRO",
        status: "SUCCEEDED",
        subscriptionExternalId: "billing-key-1",
      }),
    );
    expect(subscription.update).not.toHaveBeenCalled();
    expect(summary.charged).toBe(1);
  });

  it("keeps a subscription active (no plan change) when a charge fails within the grace window", async () => {
    subscription.findMany.mockResolvedValue([
      dueSubscription({ currentPeriodEnd: new Date("2026-03-09T00:00:00Z") }), // 1 day overdue
    ]);
    chargeBillingKey.mockRejectedValue(new Error("card declined"));

    const summary = await runBillingRenewals(NOW);

    expect(subscription.update).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
    expect(summary.failed).toBe(1);
    expect(summary.expired).toBe(0);
  });

  it("expires the subscription once the grace window is exceeded", async () => {
    subscription.findMany.mockResolvedValue([
      dueSubscription({ currentPeriodEnd: new Date("2026-03-05T00:00:00Z") }), // 5 days overdue
    ]);
    chargeBillingKey.mockRejectedValue(new Error("card declined"));

    const summary = await runBillingRenewals(NOW);

    expect(subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "EXPIRED" },
    });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "TRIAL", subscriptionStatus: "EXPIRED" },
    });
    expect(summary.expired).toBe(1);
  });
});
