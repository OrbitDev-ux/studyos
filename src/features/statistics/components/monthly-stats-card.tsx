import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import type { MonthlyStatistics } from "@/features/statistics/queries";
import { formatDuration } from "@/lib/format";

export function MonthlyStatsCard({
  stats,
  t,
  locale,
}: {
  stats: MonthlyStatistics;
  t: Messages["stats"];
  locale: Locale;
}) {
  const deltaCopy =
    stats.direction === "up"
      ? t.monthlyDeltaUp.replace(
          "{duration}",
          formatDuration(Math.abs(stats.deltaSeconds), locale),
        )
      : stats.direction === "down"
        ? t.monthlyDeltaDown.replace(
            "{duration}",
            formatDuration(Math.abs(stats.deltaSeconds), locale),
          )
        : t.monthlyDeltaFlat;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{t.monthlyTotalLabel}</CardTitle>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatDuration(stats.totalSeconds, locale)}
          </p>
        </div>
        {stats.direction !== "flat" && (
          <Badge
            variant={stats.direction === "up" ? "success" : "secondary"}
            data-icon="inline-start"
          >
            {stats.direction === "up" ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {formatDuration(Math.abs(stats.deltaSeconds), locale)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">{deltaCopy}</p>
        <div className="grid grid-cols-3 gap-3 border-t pt-3">
          <div>
            <p className="text-muted-foreground text-xs">{t.monthlyAvgLabel}</p>
            <p className="text-sm font-medium tabular-nums">
              {formatDuration(stats.avgDailySeconds, locale)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t.monthlyActiveDaysLabel}</p>
            <p className="text-sm font-medium tabular-nums">
              {t.monthlyActiveDaysValue.replace("{count}", String(stats.activeDayCount))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t.topSubjectLabel}</p>
            {stats.topSubject?.subject ? (
              <SubjectChip
                name={stats.topSubject.subject.name}
                color={stats.topSubject.subject.color}
                className="mt-0.5"
              />
            ) : (
              <p className="text-sm font-medium">{t.topSubjectEmpty}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
