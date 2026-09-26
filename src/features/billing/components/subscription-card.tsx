import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionCancelControls } from "@/features/billing/components/subscription-cancel-controls";
import type { PlanSummary } from "@/features/billing/usage";

/**
 * Read-only legacy billing details for existing subscribers. New purchases
 * are disabled; cancellation controls remain available to existing customers.
 */
export function SubscriptionCard({ summary }: { summary: PlanSummary }) {
  const hasActiveSubscription = summary.currentPeriodEnd !== null;
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
        <CardTitle className="text-base">기존 구독 관리</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-sm">
              {summary.cancelAtPeriodEnd ? "자동 갱신이 종료 예정입니다." : "기존 결제의 갱신을 관리할 수 있습니다."}
            </p>
          </div>
        </div>

        {hasActiveSubscription && periodEndLabel && (
          <p className="text-muted-foreground text-xs">
            {summary.cancelAtPeriodEnd
              ? `${periodEndLabel}에 구독이 종료돼요.`
              : `다음 결제일: ${periodEndLabel}`}
          </p>
        )}

        {hasActiveSubscription && (
          <SubscriptionCancelControls cancelAtPeriodEnd={summary.cancelAtPeriodEnd} />
        )}
      </CardContent>
    </Card>
  );
}
