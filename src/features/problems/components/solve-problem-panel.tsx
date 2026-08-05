"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitProblemAnswer } from "@/features/problems/actions";
import type { getProblems } from "@/features/problems/queries";
import { cn } from "@/lib/utils";

export function SolveProblemPanel({
  problem,
}: {
  problem: Awaited<ReturnType<typeof getProblems>>[number];
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const res = await submitProblemAnswer(problem.id, {
        choiceId: selectedChoiceId ?? undefined,
        text: answerText || undefined,
      });
      setResult(res);
    });
  }

  const canSubmit =
    problem.type === "MULTIPLE_CHOICE"
      ? !!selectedChoiceId
      : answerText.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {problem.type === "MULTIPLE_CHOICE" ? (
        <div className="flex flex-col gap-1.5">
          {problem.choices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id;
            const revealed = result !== null;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={revealed}
                onClick={() => setSelectedChoiceId(choice.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  isSelected && !revealed && "border-primary bg-primary/5",
                  revealed &&
                    choice.isCorrect &&
                    "border-primary bg-primary/10 font-medium",
                  revealed &&
                    isSelected &&
                    !choice.isCorrect &&
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
          placeholder="정답 입력"
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          disabled={result !== null}
        />
      )}

      {result === null ? (
        <Button
          type="button"
          size="sm"
          className="self-start"
          disabled={!canSubmit || isPending}
          onClick={handleSubmit}
        >
          제출
        </Button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p
            className={cn(
              "text-sm font-medium",
              result.correct ? "text-primary" : "text-destructive",
            )}
          >
            {result.correct ? "정답입니다!" : "오답입니다. 오답노트에 저장되었어요."}
          </p>
          {result.explanation && (
            <p className="text-muted-foreground text-xs">{result.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
