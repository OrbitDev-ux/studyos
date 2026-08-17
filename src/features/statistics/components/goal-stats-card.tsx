import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Messages } from "@/features/i18n/messages";
import type { GoalStatistics } from "@/features/statistics/queries";
import { cn } from "@/lib/utils";

export function GoalStatsCard({
  stats,
  t,
}: {
  stats: GoalStatistics;
  t: Messages["stats"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.goalsTodayTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {stats.today.totalCount === 0 ? (
          <p className="text-muted-foreground text-sm">{t.goalsTodayEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stats.today.goals.map((goal) => {
              const completed = goal.currentValue >= goal.targetValue;
              return (
                <li key={goal.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                      completed
                        ? "bg-success border-success text-success-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {completed && <Check className="size-3" />}
                  </span>
                  <span className={cn(completed && "text-muted-foreground line-through")}>
                    {goal.title}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">{t.goalsWeekTitle}</span>
          <span className="font-medium tabular-nums">
            {t.goalsCompletedOf
              .replace("{completed}", String(stats.week.completedCount))
              .replace("{total}", String(stats.week.totalCount))}
          </span>
        </div>
        <Progress value={stats.week.percent} />
      </CardContent>
    </Card>
  );
}
