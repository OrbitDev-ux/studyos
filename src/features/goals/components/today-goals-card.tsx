import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Subject } from "@/generated/prisma/client";
import { CreateGoalDialog } from "@/features/goals/components/create-goal-dialog";
import { GoalProgressButton } from "@/features/goals/components/goal-progress-button";
import type { getTodayGoals } from "@/features/goals/queries";

export function TodayGoalsCard({
  goals,
  subjects,
}: {
  goals: Awaited<ReturnType<typeof getTodayGoals>>;
  subjects: Subject[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>오늘 목표</CardTitle>
        <CreateGoalDialog subjects={subjects} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {goals.length === 0 ? (
          <p className="text-muted-foreground text-sm">오늘 설정한 목표가 없습니다.</p>
        ) : (
          goals.map((goal) => {
            const percent = Math.min(
              100,
              Math.round((goal.currentValue / goal.targetValue) * 100),
            );
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
