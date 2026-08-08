"use client";

import { Sparkles, Star } from "lucide-react";
import { DEMO_PROBLEMS } from "@/features/demo/data";
import { DemoProblemSolver } from "@/features/demo/components/demo-problem-solver";
import { useDemo } from "@/features/demo/state";

export function DemoProblems() {
  const { exp, level } = useDemo();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="size-5" /> 문제 풀기
        </h1>
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Star className="size-4" /> Lv.{level} · {exp.toLocaleString()} EXP
        </span>
      </div>
      <p className="text-muted-foreground text-sm">
        문제를 풀면 StudyOS가 학습 패턴을 분석해요. (Demo — 실제 기록은 저장되지 않아요)
      </p>
      <div className="flex flex-col gap-3">
        {DEMO_PROBLEMS.map((problem) => (
          <DemoProblemSolver key={problem.id} problem={problem} />
        ))}
      </div>
    </div>
  );
}
