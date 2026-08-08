"use client";

import Link from "next/link";
import { Award, Brain, Flame, HelpCircle, ListChecks, Sparkles, Star, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { DailyMissionCard } from "@/features/learning/components/daily-mission-card";
import { WeaknessCard } from "@/features/learning/components/weakness-card";
import {
  DEMO_AI_RECOMMENDATION,
  DEMO_RECENT_ACTIVITY,
  DEMO_REVIEW_SCHEDULE,
  DEMO_STUDENT,
  DEMO_WEAKNESS_UNITS,
} from "@/features/demo/data";
import { DEMO_TOUR_EVENT } from "@/features/demo/components/demo-tour-launcher";
import { useDemo } from "@/features/demo/state";

export function DemoDashboard() {
  const { exp, level, levelProgressPercent, totalSolved, missionBoard } = useDemo();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            안녕하세요, {DEMO_STUDENT.name}님
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {DEMO_STUDENT.grade} · Demo 학습 현황
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={() => window.dispatchEvent(new Event(DEMO_TOUR_EVENT))}
        >
          <HelpCircle className="size-4" />
          둘러보기 다시 보기
        </Button>
      </div>

      {/* Growth summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="연속 공부일" value={`${DEMO_STUDENT.streakDays}일`} icon={Flame} />
        <StatCard label="총 문제" value={`${totalSolved}개`} icon={ListChecks} />
        <StatCard label="정답률" value={`${DEMO_STUDENT.accuracyPercent}%`} icon={Target} />
        <StatCard label="Study EXP" value={exp.toLocaleString()} icon={Star} />
      </div>

      {/* Level / EXP */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex size-12 flex-col items-center justify-center rounded-full">
            <Award className="size-5" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Level {level}</span>
              <span className="text-muted-foreground tabular-nums">
                {exp.toLocaleString()} / {DEMO_STUDENT.expForNextLevel.toLocaleString()} EXP
              </span>
            </div>
            <Progress value={Math.max(0, Math.min(100, levelProgressPercent))} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Mission + AI recommendation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div data-tour="daily-mission">
          <DailyMissionCard board={missionBoard} />
        </div>
        <div data-tour="ai-reco">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4" /> StudyOS AI 추천
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {DEMO_AI_RECOMMENDATION.summary}
              </p>
              <ol className="flex flex-col gap-1.5 text-sm">
                {DEMO_AI_RECOMMENDATION.order.map((item, i) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-xs font-medium">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
              <Button asChild size="sm" className="self-start">
                <Link href="/demo/weakness">약점 문제 풀러 가기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weakness + Review + Recent */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div data-tour="weakness">
          <WeaknessCard units={DEMO_WEAKNESS_UNITS} />
        </div>

        <div data-tour="today-review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="size-4" /> 오늘 복습
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {DEMO_REVIEW_SCHEDULE.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium tabular-nums">{row.count}개</span>
                </div>
              ))}
              <Button asChild size="sm" variant="outline" className="mt-1 self-start">
                <Link href="/demo/review">복습하러 가기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 학습</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {DEMO_RECENT_ACTIVITY.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.label}</p>
                  <p className="text-muted-foreground text-xs">{a.detail}</p>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">{a.when}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
