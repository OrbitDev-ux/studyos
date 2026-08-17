import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TrendBarChart } from "@/features/statistics/components/trend-bar-chart";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import type { WeeklyStatistics } from "@/features/statistics/queries";
import { formatDuration } from "@/lib/format";

/** Compact weekly-trend widget for the dashboard — full detail lives at /stats. */
export function WeeklyTrendMiniCard({
  stats,
  t,
  locale,
}: {
  stats: WeeklyStatistics;
  t: Messages["stats"];
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.weeklyTotalLabel}</CardTitle>
        <Link
          href="/stats"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
        >
          {t.title}
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xl font-semibold tabular-nums">
          {formatDuration(stats.totalSeconds, locale)}
        </p>
        <TooltipProvider>
          <TrendBarChart data={stats.dailyBreakdown} locale={locale} />
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
