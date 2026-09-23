import { prisma } from "@/lib/prisma";
import { Plan } from "@/generated/prisma/client";

/**
 * Read-only revenue/retention foundation — the "계산 가능한 구조". Every number
 * here is derived from rows StudyOS already writes (Subscription/Payment/
 * Refund), so the funnel stays measurable end-to-end. This is deliberately
 * NOT an accounting system: Polar (and the Toss dashboard for legacy rows)
 * remain the authoritative money ledger; this module exists so operators and
 * product can answer "how is the funnel doing" without leaving the app.
 *
 * Admin-only consumer: /admin/revenue. Never derive from analytics events
 * (they're best-effort); the DB is the contract.
 *
 * SEMANTICS AND LIMITS (documented so the numbers can't be misread):
 *  - "Collected revenue" ≠ MRR. These metrics sum SUCCEEDED payment amounts in
 *    a UTC month (`collected`). A true MRR is NOT modeled yet; the schema
 *    supports it trivially, but deriving it now would duplicate Polar's own
 *    recurring-revenue reporting for no operational gain.
 *  - CURRENCY ISOLATION: revenue is grouped PER CURRENCY (Payments/Refunds are
 *    real historical records in the currency they were charged/refunded in).
 *    A USD $9.99 order is `999 USD`, never converted and NEVER summed into a
 *    KRW figure or a mixed "total" (e.g. never 999 + 4900 = 5899). The return
 *    shape is a map keyed by ISO currency; every amount stays in its own unit.
 *  - Full + partial refunds are both counted in refundsThisMonth; the NET for
 *    a currency is a consumer-side derivation: collected − refunds.
 *  - Canceled / expired subscriptions do NOT reduce the collected totals: they
 *    are churn signals (pendingCancellations), not negative revenue.
 *  - Period boundary: "this month" means since the start of the current UTC
 *    month (no local-timezone splitting).
 *  - Duplicate charges cannot double-count: Payment/Refund idempotency keys
 *    are @unique, so redelivered webhooks collapse to a single row.
 *  - newPayingUsersThisMonth = users whose EARLIEST SUCCEEDED payment ever
 *    falls in this month (first-ever purchase, not upgrades/renewals).
 */

export type CurrencyTotals = {
  count: number;
  /** Sum in THIS currency's minor units (never mixed across currencies). */
  amountTotal: number;
};

/** Revenue grouped by ISO currency — the only way amounts are ever totaled. */
export type CurrencyBreakdown = Record<string, CurrencyTotals>;

export type BillingMetrics = {
  asOf: string;
  /** Subscriptions in an ACTIVE PRO/PREMIUM state right now. */
  activePaidSubscriptions: number;
  /** All-time SUCCEEDED payment volume, per currency. */
  succeededPaymentsAllTime: CurrencyBreakdown;
  /** SUCCEEDED payment volume since the start of the current UTC month. */
  succeededPaymentsThisMonth: CurrencyBreakdown;
  /** All-time SUCCEEDED refund volume, per currency. */
  refundsAllTime: CurrencyBreakdown;
  /** SUCCEEDED refund volume since the start of the current UTC month. */
  refundsThisMonth: CurrencyBreakdown;
  /** Users whose very first SUCCEEDED payment (any time) fell in this month —
   * i.e. brand-new paying users, not upgrades/renewals. */
  newPayingUsersThisMonth: number;
  /** ACTIVE subscriptions currently flagged to lapse at period end. */
  pendingCancellations: number;
};

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

type AmountRow = { amount: number; currency?: string | null };

/**
 * Groups SUCCEEDED amounts per currency. NEVER sums across currencies — a USD
 * $9.99 order stays `USD: 999` and a ₩4,900 Toss renewal stays `KRW: 4900`;
 * there is deliberately no mixed total and no conversion.
 */
function aggregateCurrencyTotals(rows: AmountRow[]): CurrencyBreakdown {
  const byCurrency: CurrencyBreakdown = {};
  for (const row of rows) {
    const currency = row.currency ?? "KRW";
    const bucket = byCurrency[currency] ?? { count: 0, amountTotal: 0 };
    bucket.count += 1;
    bucket.amountTotal += row.amount;
    byCurrency[currency] = bucket;
  }
  return byCurrency;
}

export async function getBillingMetrics(
  options: { now?: Date } = {},
): Promise<BillingMetrics> {
  const now = options.now ?? new Date();
  const monthStart = startOfMonth(now);

  const [
    activePaidSubscriptions,
    paymentsAllTime,
    paymentsThisMonth,
    refundsAllTime,
    refundsThisMonth,
    pendingCancellations,
    newPayerGroups,
  ] = await Promise.all([
    prisma.subscription.count({
      where: { status: "ACTIVE", plan: { in: [Plan.PRO, Plan.PREMIUM] } },
    }),
    prisma.payment.findMany({
      where: { status: "SUCCEEDED" },
      select: { amount: true, currency: true },
    }),
    prisma.payment.findMany({
      where: { status: "SUCCEEDED", paidAt: { gte: monthStart } },
      select: { amount: true, currency: true },
    }),
    // Refund has no own currency column — its amount is denominated in its
    // payment's currency (via the payment relation).
    prisma.refund.findMany({
      where: { status: "SUCCEEDED" },
      select: { amount: true, payment: { select: { currency: true } } },
    }),
    prisma.refund.findMany({
      where: { status: "SUCCEEDED", processedAt: { gte: monthStart } },
      select: { amount: true, payment: { select: { currency: true } } },
    }),
    prisma.subscription.count({
      where: { status: "ACTIVE", cancelAtPeriodEnd: true },
    }),
    prisma.payment.groupBy({
      by: ["userId"],
      where: { status: "SUCCEEDED", userId: { not: null } },
      _min: { paidAt: true },
      // Keeps only users whose earliest-ever SUCCEEDED payment is this month.
      having: { paidAt: { _min: { gte: monthStart } } },
    }),
  ]);

  return {
    asOf: now.toISOString(),
    activePaidSubscriptions,
    succeededPaymentsAllTime: aggregateCurrencyTotals(paymentsAllTime),
    succeededPaymentsThisMonth: aggregateCurrencyTotals(paymentsThisMonth),
    refundsAllTime: aggregateCurrencyTotals(
      refundsAllTime.map((r) => ({ amount: r.amount, currency: r.payment.currency })),
    ),
    refundsThisMonth: aggregateCurrencyTotals(
      refundsThisMonth.map((r) => ({ amount: r.amount, currency: r.payment.currency })),
    ),
    newPayingUsersThisMonth: newPayerGroups.length,
    pendingCancellations,
  };
}
