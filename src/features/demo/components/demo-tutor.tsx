"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_TUTOR } from "@/features/demo/data";

/**
 * Demo AI Tutor — progressive help (힌트 → 풀이 방향 → 상세 풀이). Responses are
 * fixed mock scripts (DEMO_TUTOR); NO Gemini call is ever made.
 */
export function DemoTutor() {
  const [revealed, setRevealed] = useState(0); // number of steps shown

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Bot className="size-5" /> AI 튜터
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">학생 질문</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="bg-muted rounded-md p-3 text-sm">🧑‍🎓 {DEMO_TUTOR.problem}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {DEMO_TUTOR.steps.slice(0, revealed).map((step) => (
          <Card key={step.id}>
            <CardContent className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{step.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {revealed < DEMO_TUTOR.steps.length ? (
        <Button
          type="button"
          className="self-start"
          onClick={() => setRevealed((n) => n + 1)}
        >
          {DEMO_TUTOR.steps[revealed]!.label} 보기
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">
          실제 StudyOS에서는 AI 튜터가 문제에 맞춰 단계별로 설명해줘요. (Demo — 실제 AI 호출 없음)
        </p>
      )}
    </div>
  );
}
