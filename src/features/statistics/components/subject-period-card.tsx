import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import type { SubjectStatistic } from "@/features/statistics/queries";
import { formatDuration } from "@/lib/format";

/** Short "month day" for a session timestamp, in the user's own timezone (not UTC). */
function formatInTimezone(date: Date, locale: Locale, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  }).format(date);
}

export function SubjectPeriodCard({
  stats,
  t,
  locale,
  timezone,
}: {
  stats: SubjectStatistic[];
  t: Messages["stats"];
  locale: Locale;
  timezone: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.subjectStatsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.subjectStatsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {stats.map((s) => (
              <li key={s.subject?.id ?? "unassigned"} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <SubjectChip
                    name={s.subject?.name ?? t.subjectUnassigned}
                    color={s.subject?.color}
                  />
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatDuration(s.seconds, locale)}
                    <span className="ml-1.5 text-xs">{s.percent}%</span>
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.percent}%`,
                      backgroundColor: s.subject?.color ?? "var(--muted-foreground)",
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {t.subjectSessionsLabel.replace("{count}", String(s.sessionCount))}
                  {" · "}
                  {t.subjectAvgLabel.replace(
                    "{duration}",
                    formatDuration(s.avgSessionSeconds, locale),
                  )}
                  {s.lastStudiedAt && (
                    <>
                      {" · "}
                      {t.subjectLastStudiedLabel.replace(
                        "{date}",
                        formatInTimezone(s.lastStudiedAt, locale, timezone),
                      )}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
