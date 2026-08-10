"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitProblemAnswer } from "@/features/problems/actions";
import { cn } from "@/lib/utils";

/** The minimal problem shape this panel needs — structural so it can be reused
 * by any surface (problems list, study-book viewer) without a shared row type.
 * The essay fields are used only when `type === "ESSAY"`. */
export type SolvableProblem = {
  id: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  choices: { id: string; label: string; content: string; isCorrect: boolean }[];
  /** ESSAY: model answer. SHORT_ANSWER: canonical answer (not shown here). */
  answerText?: string | null;
  explanation?: string | null;
  /** ESSAY: key scoring points / partial-credit criteria. */
  scoringCriteria?: string | null;
};

export function SolveProblemPanel({
  problem,
  source,
}: {
  problem: SolvableProblem;
  /** Where this solve came from — "review" for 오답노트 retries. */
  source?: "practice" | "review";
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [revealed, setRevealed] = useState(false); // essay: model answer shown
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEssay = problem.type === "ESSAY";
  const isMc = problem.type === "MULTIPLE_CHOICE";

  function submit(payload: { choiceId?: string; text?: string; selfCorrect?: boolean }) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitProblemAnswer(
          problem.id,
          payload,
          source ? { source } : undefined,
        );
        setResult(res);
      } catch (err) {
        // A banned/expired session redirects (e.g. to /suspended); re-throw
        // framework signals so navigation happens instead of a misleading error.
        unstable_rethrow(err);
        setError("채점에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  // ── ESSAY: write → reveal model answer / criteria → self-assess ──
  if (isEssay) {
    return (
      <div className="flex flex-col gap-3">
        <Textarea
          rows={5}
          placeholder="풀이 과정과 답을 서술해보세요."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          disabled={revealed}
        />

        {!revealed ? (
          <Button
            type="button"
            size="sm"
            className="self-start"
            disabled={answerText.trim().length === 0}
            onClick={() => setRevealed(true)}
          >
            모범답안 확인
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            {problem.answerText && (
              <div className="bg-primary/5 rounded-md p-3 text-sm">
                <p className="text-muted-foreground mb-1 text-xs font-medium">모범 답안</p>
                <p className="whitespace-pre-wrap">{problem.answerText}</p>
              </div>
            )}
            {problem.scoringCriteria && (
              <div className="bg-muted rounded-md p-3 text-sm">
                <p className="text-muted-foreground mb-1 text-xs font-medium">핵심 채점 요소</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {problem.scoringCriteria}
                </p>
              </div>
            )}
            {problem.explanation && (
              <p className="text-muted-foreground bg-muted rounded-md p-3 text-xs whitespace-pre-wrap">
                {problem.explanation}
              </p>
            )}

            {result === null ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-muted-foreground text-xs">
                  내 답안을 모범 답안과 비교해 스스로 채점해주세요.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => submit({ text: answerText, selfCorrect: true })}
                  >
                    잘 풀었어요
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => submit({ text: answerText, selfCorrect: false })}
                  >
                    더 연습할래요
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  "text-sm font-medium",
                  result.correct ? "text-primary" : "text-destructive",
                )}
              >
                {result.correct
                  ? "학습 기록에 반영되었어요!"
                  : "복습 목록에 추가했어요. 다시 연습해봐요."}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    );
  }

  // ── MULTIPLE_CHOICE / SHORT_ANSWER (unchanged auto-graded flow) ──
  const canSubmit = isMc ? !!selectedChoiceId : answerText.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {isMc ? (
        <div className="flex flex-col gap-1.5">
          {problem.choices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id;
            const revealedResult = result !== null;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={revealedResult}
                onClick={() => setSelectedChoiceId(choice.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  isSelected && !revealedResult && "border-primary bg-primary/5",
                  revealedResult && choice.isCorrect && "border-primary bg-primary/10 font-medium",
                  revealedResult &&
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
          onClick={() => submit({ choiceId: selectedChoiceId ?? undefined, text: answerText || undefined })}
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

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
