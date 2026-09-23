import { Banknote, CreditCard, RefreshCcw, TrendingUp, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatTile } from "@/features/admin/components/stat-tile";
import { getBillingMetrics, type CurrencyBreakdown } from "@/features/billing/metrics";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

/** Formats an amount in its own currency — never converted, never mixed. */
function formatAmount(amount: number, currency: string): string {
  if (currency === "USD") {
    return `$${(amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}

/** All currencies that appear in payments or refunds (sorted for stable UI). */
function unionCurrencies(...breakdowns: CurrencyBreakdown[]): string[] {
  const set = new Set<string>();
  for (const breakdown of breakdowns) {
    for (const currency of Object.keys(breakdown)) set.add(currency);
  }
  return [...set].sort();
}

function CurrencyRow({
  currency,
  breakdown,
}: {
  currency: string;
  breakdown: CurrencyBreakdown;
}) {
  const gross = breakdown[currency]?.amountTotal ?? 0;
  const count = breakdown[currency]?.count ?? 0;
  return (
    <li className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground w-14 font-medium">{currency}</span>
      <span className="tabular-nums">{formatAmount(gross, currency)}</span>
      <span className="text-muted-foreground text-xs tabular-nums">{count}건</span>
    </li>
  );
}

/**
 * 수익 지표 — read-only funnel foundation (see billing/metrics.ts). SUPER_ADMIN
 * (manageSystem) only: this is financial data. The authoritative money ledger
 * is the Polar dashboard (and Toss for legacy rows); these numbers are the
 * in-app "계산 가능한 구조" derived from Subscription/Payment/Refund rows.
 *
 * PRICING UNITS: revenue is grouped PER CURRENCY. The current catalog sells
 * PRO at $9.99 USD/month (Polar), while legacy Toss rows are KRW. Amounts are
 * always shown in their own currency — USD $9.99 is never converted to ₩ and
 * USD + KRW are never summed into a single total.
 */
export default async function AdminRevenuePage() {
  await requireCapability("manageSystem");
  const m = await getBillingMetrics();

  const monthCurrencies = unionCurrencies(
    m.succeededPaymentsThisMonth,
    m.refundsThisMonth,
  );
  const allTimeCurrencies = unionCurrencies(m.succeededPaymentsAllTime, m.refundsAllTime);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="수익 지표"
        description="결제 기반 이용자 현황(통화별, 환산 없음). 상세 잔액은 Polar 대시보드를 기준으로 하세요."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="유료 구독 중"
          value={m.activePaidSubscriptions}
          icon={CreditCard}
          accent="success"
        />
        <StatTile
          label="이번 달 신규 결제자"
          value={m.newPayingUsersThisMonth}
          icon={UserPlus}
          hint="최초 결제가 이번 달인 사용자"
        />
        <StatTile
          label="만료 예정 구독"
          value={m.pendingCancellations}
          icon={RefreshCcw}
          hint="기간 종료 시 취소될 구독"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Banknote className="size-4" />
              이번 달 매출 (통화별)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            {monthCurrencies.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                이번 달 결제 내역이 없습니다.
              </p>
            ) : (
              <ul>
                {monthCurrencies.map((currency) => {
                  const gross = m.succeededPaymentsThisMonth[currency]?.amountTotal ?? 0;
                  const refunds = m.refundsThisMonth[currency]?.amountTotal ?? 0;
                  const net = gross - refunds;
                  return (
                    <li
                      className="flex flex-col gap-1 border-b py-2 last:border-0"
                      key={currency}
                    >
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span className="w-14">{currency}</span>
                        <span className="tabular-nums">
                          Gross {formatAmount(gross, currency)}
                        </span>
                        <span className="tabular-nums">
                          Refunds {formatAmount(refunds, currency)}
                        </span>
                        <span className="tabular-nums">
                          Net {formatAmount(net, currency)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        결제{" "}
                        {(m.succeededPaymentsThisMonth[currency]?.count ?? 0) +
                          (m.refundsThisMonth[currency]?.count ?? 0)}
                        건 · 환불 {m.refundsThisMonth[currency]?.count ?? 0}건
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-muted-foreground mt-2 text-xs">
              통화 conversion 없음 · 서로 다른 통화는 절대 합산하지 않음 (예: USD 999 +
              KRW 4900 ≠ 5899)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              전체 누적 결제액 (통화별)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            {allTimeCurrencies.length === 0 ? (
              <p className="text-muted-foreground text-sm">누적 결제 내역이 없습니다.</p>
            ) : (
              <ul>
                {allTimeCurrencies.map((currency) => (
                  <li key={currency}>
                    <CurrencyRow
                      currency={currency}
                      breakdown={m.succeededPaymentsAllTime}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>계산 기준</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          <p>
            이 화면의 숫자는 Subscription/Payment/Refund 테이블에서 파생한 운영용
            지표입니다. Polar(Toss 레거시)가 최종 매출 장부이고, 이 화면은 결제 퍼널과
            현황을 앱 안에서 확인하기 위한 용도입니다.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>모든 금액은 통화별로 표시 — USD는 $, KRW는 원 단위 (환산·합산 없음)</li>
            <li>Net(통화별) = 이번 달 SUCCEEDED 결제 합계 − 환불 합계 (해당 통화만)</li>
            <li>신규 결제자 = 최초 SUCCEEDED 결제 시점이 이번 달인 사용자 수</li>
            <li>이번 달 = UTC 월의 1일 이후 (한국 자정 기준이 아님)</li>
            <li>현재 판매 플랜: PRO $9.99 USD / month (Polar). KRW는 레거시 Toss 행</li>
            <li>중복 결제는 idempotency unique 키 덕분에 한 번만 집계됨</li>
            <li>
              취소/만료 구독은 매출에서 차감되지 않음 — 이탈 신호(만료 예정 구독)로만 표시
            </li>
            <li>
              MRR은 아직 모델링하지 않음: 현재 지표는 수금액 기준이며 통화를 넘어 합산하지
              않음
            </li>
            <li>as of {m.asOf}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
