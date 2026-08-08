"use client";

import { Target } from "lucide-react";
import { DailyMissionCard } from "@/features/learning/components/daily-mission-card";
import { useDemo } from "@/features/demo/state";

export function DemoMissions() {
  const { missionBoard } = useDemo();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Target className="size-5" /> 오늘의 미션
      </h1>
      <p className="text-muted-foreground text-sm">
        StudyOS가 오늘 추천하는 학습이에요. 문제를 풀면 진행도가 실시간으로 올라가요. (Demo)
      </p>
      <div className="max-w-xl">
        <DailyMissionCard board={missionBoard} />
      </div>
    </div>
  );
}
