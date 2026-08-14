import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import type { getTodaySubjectBreakdown } from "@/features/statistics/queries";
import { formatDuration } from "@/lib/format";

export function SubjectBreakdownCard({
  breakdown,
  t,
  locale,
}: {
  breakdown: Awaited<ReturnType<typeof getTodaySubjectBreakdown>>;
  t: Messages["stats"];
  locale: Locale;
}) {
  const total = breakdown.reduce((sum, item) => sum + item.seconds, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.subjectBreakdownTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {breakdown.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t.subjectBreakdownEmpty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {breakdown.map((item) => {
              // 과목 대표색으로 채운 비율 막대 — 과목 색은 사용자별 고유값이므로
              // 여기선 브랜드 팔레트(--chart-*) 대신 과목색을 쓰는 게 의미상 맞다.
              const color = item.subject?.color ?? "var(--muted-foreground)";
              const percent = total === 0 ? 0 : Math.round((item.seconds / total) * 100);
              return (
                <li
                  key={item.subject?.id ?? "unassigned"}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {item.subject?.name ?? t.subjectUnassigned}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatDuration(item.seconds, locale)}
                      <span className="ml-1.5 text-xs">{percent}%</span>
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percent}%`, backgroundColor: color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
