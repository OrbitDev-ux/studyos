import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Subject } from "@/generated/prisma/client";
import { CreateGoalDialog } from "@/features/goals/components/create-goal-dialog";
import { GoalProgressButton } from "@/features/goals/components/goal-progress-button";
import type { getTodayGoals } from "@/features/goals/queries";
import type { Messages } from "@/features/i18n/messages";
import { computeGoalFillPercent } from "@/features/statistics/aggregate";

export function TodayGoalsCard({
  goals,
  subjects,
  t,
}: {
  goals: Awaited<ReturnType<typeof getTodayGoals>>;
  subjects: Subject[];
  t: Messages["goals"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.todayTitle}</CardTitle>
        <CreateGoalDialog subjects={subjects} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {goals.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.todayEmpty}</p>
        ) : (
          goals.map((goal) => {
            const percent = computeGoalFillPercent(goal);
            return (
              <div key={goal.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{goal.title}</span>
                  <span className="text-muted-foreground">
                    {goal.currentValue} / {goal.targetValue}
                    {goal.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={percent} className="h-2" />
                  <GoalProgressButton
                    goalId={goal.id}
                    disabled={goal.currentValue >= goal.targetValue}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
