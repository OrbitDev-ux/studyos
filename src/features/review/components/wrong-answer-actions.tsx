"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitProblemAnswer } from "@/features/problems/actions";
import {
  analyzeWrongAnswerDna,
  markResolved,
  requestAiExplanation,
} from "@/features/review/actions";
import { ERROR_TYPE_LABEL, toErrorType, type WrongAnswerDna } from "@/features/review/dna";
import type { getWrongAnswers } from "@/features/review/queries";
import { SolveProblemPanel } from "@/features/problems/components/solve-problem-panel";
import { cn } from "@/lib/utils";

export function WrongAnswerActions({
  wrongAnswer,
  canUseDna,
}: {
  wrongAnswer: Awaited<ReturnType<typeof getWrongAnswers>>[number];
  canUseDna: boolean;
}) {
  const { problem } = wrongAnswer;
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string | null;
  } | null>(null);
  const [explanation, setExplanation] = useState(wrongAnswer.aiExplanation);
  const [dna, setDna] = useState<WrongAnswerDna | null>(
    wrongAnswer.errorType
      ? {
          type: toErrorType(wrongAnswer.errorType),
          concept: wrongAnswer.errorConcept ?? "",
          reason: wrongAnswer.errorReason ?? "",
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();
  const [isExplaining, startExplaining] = useTransition();
  const [isAnalyzing, startAnalyzing] = useTransition();
  const [isResolving, startResolving] = useTransition();

  if (wrongAnswer.resolved && !result) {
    return <p className="text-muted-foreground text-sm">해결한 문제입니다.</p>;
  }

  function handleRetry() {
    setError(null);
    startSubmitting(async () => {
      try {
        const res = await submitProblemAnswer(
          problem.id,
          {
            choiceId: selectedChoiceId ?? undefined,
            text: answerText || undefined,
          },
          { source: "review" },
        );
        setResult(res);
      } catch (err) {
        unstable_rethrow(err);
        setError("채점에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  function handleExplain() {
    setError(null);
    startExplaining(async () => {
      try {
        const res = await requestAiExplanation(wrongAnswer.id);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        setExplanation(res.explanation);
      } catch (err) {
        unstable_rethrow(err);
        setError("AI 해설 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  function handleAnalyze() {
    setError(null);
    startAnalyzing(async () => {
      try {
        const res = await analyzeWrongAnswerDna(wrongAnswer.id);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        setDna(res);
      } catch (err) {
        unstable_rethrow(err);
        setError("오답 원인 분석에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  const canSubmit =
    problem.type === "MULTIPLE_CHOICE"
      ? !!selectedChoiceId
      : answerText.trim().length > 0;

  const isEssay = problem.type === "ESSAY";

  return (
    <div className="flex flex-col gap-3">
      {isEssay ? (
        // Essays reuse the shared solver (self-assessment against the model
        // answer) rather than the exact-match retry input.
        <SolveProblemPanel problem={problem} source="review" />
      ) : problem.type === "MULTIPLE_CHOICE" ? (
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

      <div className="flex flex-wrap items-center gap-2">
        {!isEssay &&
          (result === null ? (
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit || isSubmitting}
              onClick={handleRetry}
            >
              다시 풀기
            </Button>
          ) : (
            !result.correct && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setSelectedChoiceId(null);
                  setAnswerText("");
                }}
              >
                한 번 더 시도
              </Button>
            )
          ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isExplaining}
          onClick={handleExplain}
        >
          {isExplaining ? "생성 중..." : "AI 해설"}
        </Button>
        {!dna &&
          (canUseDna ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isAnalyzing}
              onClick={handleAnalyze}
            >
              {isAnalyzing ? "분석 중..." : "오답 원인 분석"}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/pricing">🔒 오답 DNA (PRO)</Link>
            </Button>
          ))}
        {!wrongAnswer.resolved && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isResolving}
            onClick={() => startResolving(() => markResolved(wrongAnswer.id))}
          >
            이해했어요
          </Button>
        )}
      </div>

      {result && (
        <p
          className={cn(
            "text-sm font-medium",
            result.correct ? "text-primary" : "text-destructive",
          )}
        >
          {result.correct ? "정답입니다! 복습 일정에 반영되었습니다." : "아직 오답입니다."}
        </p>
      )}

      {dna && (
        <div className="bg-muted flex flex-col gap-1 rounded-md p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-medium">
              {ERROR_TYPE_LABEL[dna.type]}
            </span>
            {dna.concept && <span className="font-medium">{dna.concept}</span>}
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap">{dna.reason}</p>
        </div>
      )}

      {explanation && (
        <p className="text-muted-foreground bg-muted rounded-md p-3 text-xs whitespace-pre-wrap">
          {explanation}
        </p>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
