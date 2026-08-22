"use client";

import { useState } from "react";
import { Brain, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import { WeaknessCard } from "@/features/learning/components/weakness-card";
import {
  DEMO_PROBLEMS,
  DEMO_WEAKNESS_UNITS,
  DEMO_WEAK_PROBLEMS,
  type DemoWeakProblem,
} from "@/features/demo/data";
import { DemoProblemSolver } from "@/features/demo/components/demo-problem-solver";
import { getMessages } from "@/features/i18n/messages";

const t = getMessages("ko-KR").dashboard;

const CATEGORY_LABEL: Record<DemoWeakProblem["category"], string> = {
  REVIEW_DUE: "🔄 복습",
  REPEATED_WRONG: "🔥 우선 복습",
  LOW_MASTERY: "📉 약점",
};

function WeakProblemItem({ item }: { item: DemoWeakProblem }) {
  const [solving, setSolving] = useState(false);
  const problem = DEMO_PROBLEMS.find((p) => p.id === item.problemId);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{CATEGORY_LABEL[item.category]}</Badge>
          <span className="font-medium">{item.unit}</span>
          <Badge variant="outline">{DIFFICULTY_LABEL[item.difficulty]}</Badge>
        </div>
        <p className="text-muted-foreground text-xs">{item.reason}</p>
        <div className="flex items-center gap-2">
          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${item.masteryPercent}%` }}
            />
          </div>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {item.masteryPercent}% mastery
          </span>
        </div>

        {problem && !solving && (
          <Button type="button" size="sm" className="self-start" onClick={() => setSolving(true)}>
            문제 풀기
          </Button>
        )}
        {problem && solving && <DemoProblemSolver problem={problem} />}
      </CardContent>
    </Card>
  );
}

export function DemoWeakness() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Brain className="size-5" /> 오늘의 약점 문제
      </h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Flame className="size-4" /> 우선순위가 높은 순서예요.
          </div>
          {DEMO_WEAK_PROBLEMS.map((item) => (
            <WeakProblemItem key={item.problemId} item={item} />
          ))}
        </div>
        <div>
          <WeaknessCard units={DEMO_WEAKNESS_UNITS} t={t} />
        </div>
      </div>
    </div>
  );
}
