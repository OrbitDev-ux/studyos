import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MissionBoard } from "@/features/learning/mission";
import type { Messages } from "@/features/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * 오늘의 Study Mission. Every number here is computed from the user's real
 * ProblemAttempt / review data (see getDailyMissionBoard) — no fabricated
 * values. A new user with no data sees a first-step empty state.
 */
export function DailyMissionCard({ board, t }: { board: MissionBoard; t: Messages["dashboard"] }) {
  const firstIncomplete = board.missions.find((m) => !m.completed);
  const startHref = firstIncomplete?.href ?? "/problems";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" /> {t.dailyMissionTitle}
        </CardTitle>
        {board.hasData && board.estimatedMinutes > 0 && (
          <span className="text-muted-foreground text-xs">
            {t.dailyMissionEstimate.replace("{minutes}", String(board.estimatedMinutes))}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!board.hasData ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">{t.dailyMissionEmpty}</p>
            <Button asChild size="sm">
              <Link href="/problems">{t.dailyMissionEmptyCta}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t.dailyMissionProgress}</span>
                <span className="tabular-nums">{board.progressPercent}%</span>
              </div>
              <Progress value={board.progressPercent} className="h-2" />
            </div>

            <ul className="flex flex-col gap-2">
              {board.missions.map((mission) => (
                <li key={mission.id} className="flex items-center gap-2 text-sm">
                  {mission.completed ? (
                    <CheckCircle2 className="text-primary size-4 shrink-0" />
                  ) : (
                    <Circle className="text-muted-foreground size-4 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      mission.completed && "text-muted-foreground line-through",
                    )}
                  >
                    {mission.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {mission.done}/{mission.target}
                  </span>
                </li>
              ))}
            </ul>

            <Button asChild size="sm" className="self-start">
              <Link href={startHref}>
                {board.progressPercent >= 100 ? t.dailyMissionContinue : t.dailyMissionStart}
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
