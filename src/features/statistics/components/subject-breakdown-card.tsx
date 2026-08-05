import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getTodaySubjectBreakdown } from "@/features/statistics/queries";
import { formatDurationKorean } from "@/lib/format";

export function SubjectBreakdownCard({
  breakdown,
}: {
  breakdown: Awaited<ReturnType<typeof getTodaySubjectBreakdown>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>과목별 공부시간</CardTitle>
      </CardHeader>
      <CardContent>
        {breakdown.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            오늘 기록된 공부시간이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {breakdown.map((item) => (
              <li
                key={item.subject?.id ?? "unassigned"}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: item.subject?.color ?? "var(--muted-foreground)",
                    }}
                  />
                  {item.subject?.name ?? "과목 미지정"}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatDurationKorean(item.seconds)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
