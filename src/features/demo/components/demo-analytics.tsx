"use client";

import { BarChart3, Clock, Flame, ListChecks, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { DEMO_STUDENT, DEMO_WEEKLY_STUDY } from "@/features/demo/data";
import { useDemo } from "@/features/demo/state";

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

// 브랜드 차트 팔레트(globals.css --chart-1~5)를 실제로 렌더에 연결한다.
// 요일별 막대를 팔레트로 순환시켜 토큰이 화면에 반영되는지 검증한다.
const CHART_BARS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

export function DemoAnalytics() {
  const { totalSolved } = useDemo();
  const maxMinutes = Math.max(...DEMO_WEEKLY_STUDY.map((d) => d.minutes));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <BarChart3 className="size-5" /> 학습 통계
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="총 문제" value={`${totalSolved}개`} icon={ListChecks} />
        <StatCard label="정답률" value={`${DEMO_STUDENT.accuracyPercent}%`} icon={Target} />
        <StatCard
          label="이번 주 학습시간"
          value={formatMinutes(DEMO_STUDENT.weeklyStudyMinutes)}
          icon={Clock}
        />
        <StatCard label="연속 학습" value={`${DEMO_STUDENT.streakDays}일`} icon={Flame} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">이번 주 학습시간</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end justify-between gap-2">
            {DEMO_WEEKLY_STUDY.map((d, i) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`${CHART_BARS[i % CHART_BARS.length]} w-full rounded-t transition-all`}
                    style={{ height: `${Math.round((d.minutes / maxMinutes) * 100)}%` }}
                    title={`${d.minutes}분`}
                  />
                </div>
                <span className="text-muted-foreground text-xs">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        실제 StudyOS에서는 여러분의 학습 기록으로 이런 통계가 자동으로 쌓여요. (Demo 데이터)
      </p>
    </div>
  );
}
