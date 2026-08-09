import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanSummary } from "@/features/billing/usage";

/**
 * Dashboard trial status. Renders only for trial users:
 *  - active trial → remaining days + AI/mock usage + a soft upgrade CTA
 *    (stronger tone in the last 2 days).
 *  - expired trial → data-preserved reassurance + plan-selection CTAs.
 * Paid plans render nothing (returns null).
 */
export function TrialBanner({ summary }: { summary: PlanSummary }) {
  if (summary.plan !== "TRIAL") return null;

  const expired = summary.state === "TRIAL_EXPIRED";
  const days = summary.trialDaysRemaining ?? 0;

  if (expired) {
    return (
      <Card className="border-primary/30">
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Trial이 종료되었습니다.</p>
          <p className="text-muted-foreground text-sm">
            StudyOS의 학습 기록은 그대로 보존됩니다. 계속 학습하려면 플랜을 선택해주세요.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/pricing">Pro 시작하기</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/pricing">Premium 시작하기</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ending = days <= 2;
  const ai = summary.features.aiProblemGeneration;
  const mock = summary.features.mockExamGeneration;

  return (
    <Card className="border-primary/20">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="text-primary size-4" /> StudyOS Trial
          </p>
          <p
            className={
              ending
                ? "text-destructive text-sm font-medium"
                : "text-muted-foreground text-sm"
            }
          >
            <Clock className="mr-1 inline size-3.5" />
            {ending ? `Trial이 ${days}일 후 종료됩니다.` : `남은 기간 ${days}일`}
            {ending && " 학습 기록은 그대로 유지됩니다."}
          </p>
        </div>

        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span className="tabular-nums">
            AI 문제 {ai.used}/{ai.limit ?? "∞"}
          </span>
          <span className="tabular-nums">
            모의고사 {mock.used}/{mock.limit ?? "∞"}
          </span>
        </div>

        <Button asChild size="sm">
          <Link href="/pricing">Pro 알아보기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
