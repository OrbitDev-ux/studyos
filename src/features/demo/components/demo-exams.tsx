"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_EXAM } from "@/features/demo/data";
import { cn } from "@/lib/utils";

type Phase = "intro" | "running" | "result";

/**
 * Demo mini mock-exam. Runs entirely in client state — no MockExam/ExamResult
 * rows are created, nothing is saved. Grading is done against the static answers.
 */
export function DemoExams() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const total = DEMO_EXAM.questions.length;
  const correct = DEMO_EXAM.questions.filter((q) => answers[q.id] === q.answer).length;
  const score = Math.round((correct / total) * 100);

  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardList className="size-5" /> 모의고사
        </h1>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">📝 {DEMO_EXAM.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">문항</p>
                <p className="font-semibold">{total}개</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">제한시간</p>
                <p className="font-semibold">{DEMO_EXAM.timeLimitMinutes}분</p>
              </div>
            </div>
            <Button type="button" className="self-start" onClick={() => setPhase("running")}>
              시험 시작
            </Button>
            <p className="text-muted-foreground text-xs">Demo — 결과는 저장되지 않아요.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardList className="size-5" /> 모의고사 결과
        </h1>
        <Card className="max-w-md">
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-6">
              <div>
                <p className="text-muted-foreground text-xs">점수</p>
                <p className="text-2xl font-bold">{score}점</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">정답률</p>
                <p className="text-2xl font-bold">{score}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">정답</p>
                <p className="text-2xl font-bold">
                  {correct}/{total}
                </p>
              </div>
            </div>
            <div className="bg-muted rounded-md p-3 text-sm">
              <p className="text-muted-foreground text-xs">약점</p>
              <p className="font-medium">분수의 곱셈</p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link href="/demo/review">자동 복습하기</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setAnswers({});
                  setPhase("intro");
                }}
              >
                다시 풀기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // running
  const answeredCount = Object.keys(answers).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardList className="size-5" /> {DEMO_EXAM.title}
        </h1>
        <span className="text-muted-foreground text-sm tabular-nums">
          {answeredCount}/{total}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {DEMO_EXAM.questions.map((q, qi) => (
          <Card key={q.id}>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {qi + 1}. {q.prompt}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {q.choices.map((choice) => {
                  const isSelected = answers[q.id] === choice.label;
                  return (
                    <button
                      key={choice.label}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: choice.label }))
                      }
                      className={cn(
                        "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        isSelected && "border-primary bg-primary/5 font-medium",
                      )}
                    >
                      {choice.label}. {choice.content}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        className="self-start"
        disabled={answeredCount < total}
        onClick={() => setPhase("result")}
      >
        제출하기
      </Button>
    </div>
  );
}
