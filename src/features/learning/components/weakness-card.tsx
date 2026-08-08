import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MasteryBand, WeaknessUnit } from "@/features/learning/weakness";
import { cn } from "@/lib/utils";

const BAND_STYLE: Record<MasteryBand, { bar: string; text: string; dot: string }> = {
  RED: { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", dot: "🔴" },
  ORANGE: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", dot: "🟠" },
  GREEN: { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", dot: "🟢" },
};

/**
 * Dashboard card: per-unit weakness from the user's real attempt log. Numbers
 * are computed server-side (getTopWeaknesses) — never fabricated. New users
 * with no attempts see a first-step empty state instead of fake data.
 */
export function WeaknessCard({ units }: { units: WeaknessUnit[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4" /> 취약 개념 분석
        </CardTitle>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            아직 학습 데이터가 없습니다. 문제를 풀면 취약 개념을 분석해드려요!
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {units.map((unit) => {
              const style = BAND_STYLE[unit.band];
              return (
                <li
                  key={`${unit.subjectId ?? "none"}:${unit.unit}`}
                  className="flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="text-muted-foreground">{unit.subjectName}</span>
                      {" · "}
                      <span className="font-medium">{unit.unit}</span>
                    </span>
                    <span className={cn("shrink-0 font-medium tabular-nums", style.text)}>
                      {unit.mastery}% {style.dot}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className={cn("h-full rounded-full transition-all", style.bar)}
                      style={{ width: `${unit.mastery}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {unit.attempts}회 시도 · 정답률 {unit.overallAccuracy}%
                    {unit.recentWrongStreak >= 2 && ` · 최근 ${unit.recentWrongStreak}회 연속 오답`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
