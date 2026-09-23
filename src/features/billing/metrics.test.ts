import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Revenue metrics module (src/features/billing/metrics.ts) — the read-only
 * funnel foundation. Mocks prisma the same way as payment-service.test.ts and
 * asserts the aggregations are derived correctly. CURRENCY CONTRACT: every
 * total is grouped per currency (never converted, never mixed into a single
 * "total" like USD 999 + KRW 4900 = 5899).
 */

const { subscription, payment, refund } = vi.hoisted(() => {
  const subscription = {
    count: vi.fn(),
  };
  const payment = {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  };
  const refund = {
    findMany: vi.fn(),
  };
  return { subscription, payment, refund };
});

vi.mock("@/lib/prisma", () => ({ prisma: { subscription, payment, refund } }));

import { getBillingMetrics, startOfMonth } from "@/features/billing/metrics";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBillingMetrics", () => {
  it("groups revenue per currency — USD orders and KRW Toss rows never mingle", async () => {
    // First count = active paid; second = pending cancellations.
    subscription.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    payment.findMany.mockImplementation(async ({ where }) => {
      if (where.paidAt)
        return [
          { amount: 999, currency: "USD" },
          { amount: 4900, currency: "KRW" },
        ];
      return [
        { amount: 999, currency: "USD" },
        { amount: 999, currency: "USD" },
        { amount: 4900, currency: "KRW" },
      ];
    });
    refund.findMany.mockImplementation(async ({ where }) => {
      const rows = [
        { amount: 999, payment: { currency: "USD" } },
        { amount: 4900, payment: { currency: "KRW" } },
      ];
      return where.processedAt ? rows.slice(0, 1) : rows;
    });
    payment.groupBy.mockResolvedValue([{} as never, {} as never]);

    const metrics = await getBillingMetrics({
      now: new Date("2026-09-21T10:00:00.000Z"),
    });

    expect(metrics.activePaidSubscriptions).toBe(3);
    expect(metrics.pendingCancellations).toBe(1);
    expect(metrics.succeededPaymentsAllTime).toEqual({
      USD: { count: 2, amountTotal: 1998 },
      KRW: { count: 1, amountTotal: 4900 },
    });
    expect(metrics.succeededPaymentsThisMonth).toEqual({
      USD: { count: 1, amountTotal: 999 },
      KRW: { count: 1, amountTotal: 4900 },
    });
    expect(metrics.refundsAllTime).toEqual({
      USD: { count: 1, amountTotal: 999 },
      KRW: { count: 1, amountTotal: 4900 },
    });
    expect(metrics.refundsThisMonth).toEqual({ USD: { count: 1, amountTotal: 999 } });
    expect(metrics.newPayingUsersThisMonth).toBe(2);
    expect(metrics.asOf).toBe("2026-09-21T10:00:00.000Z");
  });

  it("never produces a mixed-currency total (USD and KRW amounts are never summed together)", async () => {
    subscription.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    payment.findMany.mockResolvedValue([
      { amount: 4900, currency: "KRW" },
      { amount: 999, currency: "USD" }, // $9.99 Polar order in USD minor units
    ]);
    refund.findMany.mockResolvedValue([{ amount: 999, payment: { currency: "USD" } }]);
    payment.groupBy.mockResolvedValue([]);

    const metrics = await getBillingMetrics({
      now: new Date("2026-09-21T10:00:00.000Z"),
    });

    // The old "KRW total" view collapsed everything; now each currency stands
    // alone — the sum 4900 + 999 appears as 5899 nowhere.
    expect(metrics.succeededPaymentsAllTime).toEqual({
      KRW: { count: 1, amountTotal: 4900 },
      USD: { count: 1, amountTotal: 999 },
    });
    expect(
      Object.values(metrics.succeededPaymentsAllTime).some((b) => b.amountTotal === 5899),
    ).toBe(false);
  });

  it("treats legacy KRW rows (no currency column) as KRW for the aggregation", async () => {
    subscription.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    payment.findMany.mockResolvedValue([{ amount: 4900 }, { amount: 4900 }]);
    refund.findMany.mockResolvedValue([]);
    payment.groupBy.mockResolvedValue([]);

    const metrics = await getBillingMetrics();

    expect(metrics.succeededPaymentsThisMonth.KRW).toEqual({
      count: 2,
      amountTotal: 9800,
    });
    expect(metrics.succeededPaymentsThisMonth.USD).toBeUndefined();
  });

  it("queries ACTIVE PRO/PREMIUM subscriptions and ACTIVE-at-period-end cancellations", async () => {
    await getBillingMetrics();

    expect(subscription.count).toHaveBeenCalledWith({
      where: { status: "ACTIVE", plan: { in: ["PRO", "PREMIUM"] } },
    });
    expect(subscription.count).toHaveBeenCalledWith({
      where: { status: "ACTIVE", cancelAtPeriodEnd: true },
    });
  });

  it("buckets 'this month' rows by the UTC month start in the payment/refund filters", async () => {
    await getBillingMetrics({ now: new Date("2026-09-21T10:00:00.000Z") });

    const monthStart = startOfMonth(new Date("2026-09-21T10:00:00.000Z"));
    expect(payment.findMany).toHaveBeenCalledWith({
      where: { status: "SUCCEEDED", paidAt: { gte: monthStart } },
      select: { amount: true, currency: true },
    });
    expect(refund.findMany).toHaveBeenCalledWith({
      where: { status: "SUCCEEDED", processedAt: { gte: monthStart } },
      select: { amount: true, payment: { select: { currency: true } } },
    });
  });
});
