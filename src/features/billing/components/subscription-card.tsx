import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PLAN_META } from "@/features/billing/plans";
import { SubscriptionCancelControls } from "@/features/billing/components/subscription-cancel-controls";
import type { MeteredUsage, PlanSummary } from "@/features/billing/usage";

function UsageRow({ label, usage }: { label: string; usage: MeteredUsage }) {
  const limit = usage.limit;
  const unlimited = limit === null;
  const pct =
    limit === null
      ? 100
      : Math.min(100, Math.round((usage.used / Math.max(1, limit)) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {usage.used} / {unlimited ? "무제한" : usage.limit}
        </span>
      </div>
      {!unlimited && <Progress value={pct} className="h-1.5" />}
    </div>
  );
}

/**
 * Current-plan + usage panel for Settings/Profile. Every number comes from the
 * server-computed PlanSummary (plan, trial, usage) — never the client.
 */
export function SubscriptionCard({ summary }: { summary: PlanSummary }) {
  const meta = PLAN_META[summary.plan];
  const isTrial = summary.plan === "TRIAL";
  const expired = summary.state === "TRIAL_EXPIRED";
  const hasActiveSubscription = !isTrial && summary.currentPeriodEnd !== null;
  const periodEndLabel = summary.currentPeriodEnd
    ? new Date(summary.currentPeriodEnd).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-base">구독</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-xs">현재 플랜</p>
            <p className="text-lg font-semibold">
              {meta.name}
              {expired && <span className="text-destructive text-sm"> (종료됨)</span>}
            </p>
            <p className="text-muted-foreground text-sm">{meta.priceLabel}</p>
          </div>
          {isTrial && summary.trialDaysRemaining !== null && !expired && (
            <div className="text-right">
              <p className="text-muted-foreground text-xs">남은 기간</p>
              <p className="text-lg font-semibold tabular-nums">
                {summary.trialDaysRemaining}일
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <UsageRow label="AI 문제 생성" usage={summary.features.aiProblemGeneration} />
          <UsageRow label="모의고사 생성" usage={summary.features.mockExamGeneration} />
        </div>

        {hasActiveSubscription && periodEndLabel && (
          <p className="text-muted-foreground text-xs">
            {summary.cancelAtPeriodEnd
              ? `${periodEndLabel}에 구독이 종료돼요.`
              : `다음 결제일: ${periodEndLabel}`}
          </p>
        )}

        <div className="flex items-center gap-2">
          {summary.plan !== "PREMIUM" ? (
            <Button asChild size="sm" className="self-start">
              <Link href="/pricing">{isTrial ? "플랜 비교하기" : "플랜 관리"}</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="self-start">
              <Link href="/pricing">플랜 관리</Link>
            </Button>
          )}
          {hasActiveSubscription && (
            <SubscriptionCancelControls cancelAtPeriodEnd={summary.cancelAtPeriodEnd} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
