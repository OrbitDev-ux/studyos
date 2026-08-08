"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import type { DemoProblem } from "@/features/demo/data";
import { useDemo } from "@/features/demo/state";
import { cn } from "@/lib/utils";

/** Normalize a short answer for lenient comparison (spaces stripped). */
function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

/**
 * A single interactive demo problem. Grading happens fully client-side against
 * the static demo data; a correct first solve adds EXP and advances the demo
 * mission via useDemo(). No ProblemAttempt, no server action, no AI call.
 */
export function DemoProblemSolver({ problem }: { problem: DemoProblem }) {
  const { solve } = useDemo();
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ correct: boolean; expGained: number } | null>(
    null,
  );

  const isMc = problem.type === "MULTIPLE_CHOICE";
  const canSubmit = isMc ? !!selected : text.trim().length > 0;

  function handleSubmit() {
    const correct = isMc
      ? selected === problem.answer
      : normalize(text) === normalize(problem.answer);
    const expGained = solve(problem.id, correct);
    setResult({ correct, expGained });
  }

  const correctChoiceContent = isMc
    ? problem.choices?.find((c) => c.label === problem.answer)?.content
    : problem.answer;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">{problem.subject}</span>
          <Badge variant="outline">{problem.unit}</Badge>
          <Badge variant="outline">{DIFFICULTY_LABEL[problem.difficulty]}</Badge>
        </div>

        <p className="text-sm font-medium whitespace-pre-wrap">{problem.prompt}</p>

        {isMc ? (
          <div className="flex flex-col gap-1.5">
            {problem.choices?.map((choice) => {
              const isSelected = selected === choice.label;
              const revealed = result !== null;
              const isAnswer = choice.label === problem.answer;
              return (
                <button
                  key={choice.label}
                  type="button"
                  disabled={revealed}
                  onClick={() => setSelected(choice.label)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    isSelected && !revealed && "border-primary bg-primary/5",
                    revealed && isAnswer && "border-primary bg-primary/10 font-medium",
                    revealed &&
                      isSelected &&
                      !isAnswer &&
                      "border-destructive bg-destructive/5",
                  )}
                >
                  {choice.label}. {choice.content}
                </button>
              );
            })}
          </div>
        ) : (
          <Input
            placeholder="정답 입력 (예: 3/10)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={result !== null}
          />
        )}

        {result === null ? (
          <Button
            type="button"
            size="sm"
            className="self-start"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            채점하기
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <p
              className={cn(
                "text-sm font-medium",
                result.correct ? "text-primary" : "text-destructive",
              )}
            >
              {result.correct
                ? `정답입니다! 🎉 ${result.expGained > 0 ? `+${result.expGained} EXP · ` : ""}Demo 학습 기록에 반영되었습니다.`
                : `아쉬워요. 정답: ${correctChoiceContent} · 이 문제는 Demo 학습 데이터에 반영되었습니다.`}
            </p>
            <div className="bg-muted text-muted-foreground rounded-md p-3 text-xs">
              <p className="whitespace-pre-wrap">{problem.explanation}</p>
            </div>
            <p className="text-muted-foreground text-xs">
              이렇게 StudyOS가 여러분의 학습을 분석해요.{" "}
              <Link href="/signup" className="text-primary hover:underline">
                내 기록을 저장하려면 계정 만들기 →
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
