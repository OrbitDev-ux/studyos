import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_META } from "@/features/billing/plans";
import type { MeteredUsage, PlanSummary } from "@/features/billing/usage";

/**
 * Compact, reusable plan indicator (e.g. "StudyOS Trial · 남은 5일 · 교재 0/1").
 * All values come from the server-computed PlanSummary (entitlement/plan logic)
 * — nothing is calculated or hardcoded on the client. Shows an upgrade link for
 * non-PREMIUM plans.
 */
export function PlanStatusChip({
  summary,
  usage,
  usageLabel,
}: {
  summary: PlanSummary;
  /** Optional metered feature to show alongside (e.g. study-book usage). */
  usage?: MeteredUsage;
  usageLabel?: string;
}) {
  const meta = PLAN_META[summary.plan];
  const isTrial = summary.plan === "TRIAL";
  const expired = summary.state === "TRIAL_EXPIRED";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Badge variant="outline" className="gap-1">
        <Sparkles className="text-primary size-3.5" />
        StudyOS {meta.name}
      </Badge>

      {isTrial && !expired && summary.trialDaysRemaining !== null && (
        <span className="text-muted-foreground">남은 {summary.trialDaysRemaining}일</span>
      )}
      {expired && <span className="text-destructive font-medium">Trial 종료됨</span>}

      {usage && usageLabel && (
        <span className="text-muted-foreground tabular-nums">
          · {usageLabel} {usage.used}/{usage.limit ?? "무제한"}
        </span>
      )}

      {summary.plan !== "PREMIUM" && (
        <Button asChild size="sm" variant="ghost" className="text-primary h-7 px-2">
          <Link href="/pricing">업그레이드</Link>
        </Button>
      )}
    </div>
  );
}
