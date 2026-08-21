"use client";

import { unstable_rethrow } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MathText } from "@/components/ui/math-text";
import { submitProblemAnswer } from "@/features/problems/actions";
import { cn } from "@/lib/utils";

/** The minimal problem shape this panel needs — structural so it can be reused
 * by any surface (problems list, study-book viewer) without a shared row type.
 * The essay fields are used only when `type === "ESSAY"`. */
export type SolvableProblem = {
  id: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  /** Deliberately no `isCorrect` here — the correct answer must never be part
   * of the initial page payload (it would ship to the client before the
   * student answers). Which choice was correct is learned only from the
   * grading result after submit (see `result.correctChoiceId` below). */
  choices: { id: string; label: string; content: string }[];
  /** ESSAY: model answer. SHORT_ANSWER: canonical answer (not shown here). */
  answerText?: string | null;
  explanation?: string | null;
  /** ESSAY: key scoring points / partial-credit criteria. */
  scoringCriteria?: string | null;
};

/** Progress within a solving session (1-based). */
export type SolveProgress = { index: number; total: number };

export function SolveProblemPanel({
  problem,
  source,
  progress,
  nextProblemId,
}: {
  problem: SolvableProblem;
  /** Where this solve came from — "review" for 오답노트 retries. */
  source?: "practice" | "review";
  /** 현재 몇 번째 / 총 몇 문제. 표시용. */
  progress?: SolveProgress;
  /** 채점 후 "다음 문제"로 스크롤할 대상 문제 id. 없으면 마지막 문제로 간주. */
  nextProblemId?: string | null;
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [revealed, setRevealed] = useState(false); // essay: model answer shown
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string | null;
    correctChoiceId: string | null;
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

  function goToNext() {
    if (!nextProblemId) return;
    const el = document.getElementById(`problem-${nextProblemId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // 접근성: 다음 카드로 포커스를 옮겨 키보드/스크린리더 흐름을 이어준다.
      el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
  }

  const hasNext = !!nextProblemId;

  // 진행률 표시(있을 때만). 채점 흐름 어디서든 재사용.
  const progressLine = progress ? (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium tabular-nums">
        {progress.index} / {progress.total}
      </span>
      <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${(progress.index / progress.total) * 100}%` }}
        />
      </div>
    </div>
  ) : null;

  // 채점 후 "다음 문제" / 마지막 문제 안내. 최소 44px 터치 타깃.
  const nextCta =
    result !== null ? (
      hasNext ? (
        <Button
          type="button"
          size="lg"
          className="self-start"
          onClick={goToNext}
          data-icon="inline-end"
        >
          다음 문제
          <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">모든 문제를 풀었어요. 수고했어요! 🎉</p>
      )
    ) : null;

  // ── ESSAY: write → reveal model answer / criteria → self-assess ──
  if (isEssay) {
    return (
      <div className="flex flex-col gap-3">
        {progressLine}
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
            size="lg"
            className="self-start"
            disabled={answerText.trim().length === 0}
            onClick={() => setRevealed(true)}
          >
            모범답안 확인
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            {problem.answerText && (
              <div className="bg-success/10 border-success/20 rounded-md border p-3 text-sm">
                <p className="text-success mb-1 text-xs font-medium">모범 답안</p>
                <MathText>{problem.answerText}</MathText>
              </div>
            )}
            {problem.scoringCriteria && (
              <div className="bg-muted rounded-md p-3 text-sm">
                <p className="text-muted-foreground mb-1 text-xs font-medium">핵심 채점 요소</p>
                <MathText className="text-muted-foreground">{problem.scoringCriteria}</MathText>
              </div>
            )}
            {problem.explanation && (
              <MathText className="text-muted-foreground bg-muted block rounded-md p-3 text-xs">
                {problem.explanation}
              </MathText>
            )}

            {result === null ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-muted-foreground text-xs">
                  내 답안을 모범 답안과 비교해 스스로 채점해주세요.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="lg"
                    variant="success"
                    className="px-5"
                    disabled={isPending}
                    onClick={() => submit({ text: answerText, selfCorrect: true })}
                  >
                    잘 풀었어요
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="px-5"
                    disabled={isPending}
                    onClick={() => submit({ text: answerText, selfCorrect: false })}
                  >
                    더 연습할래요
                  </Button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-1 flex flex-col gap-2 duration-200">
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    result.correct ? "text-success" : "text-destructive",
                  )}
                >
                  {result.correct ? (
                    <Check className="animate-in zoom-in-50 size-4 duration-300" />
                  ) : (
                    <X className="size-4" />
                  )}
                  {result.correct
                    ? "학습 기록에 반영되었어요!"
                    : "복습 목록에 추가했어요. 다시 연습해봐요."}
                </p>
                {nextCta}
              </div>
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
      {progressLine}
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
                  "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  isSelected && !revealedResult && "border-primary bg-primary/5",
                  revealedResult &&
                    choice.id === result?.correctChoiceId &&
                    "border-success bg-success/10 font-medium",
                  revealedResult &&
                    isSelected &&
                    choice.id !== result?.correctChoiceId &&
                    "border-destructive bg-destructive/5",
                )}
              >
                {revealedResult && choice.id === result?.correctChoiceId && (
                  <Check className="text-success size-4 shrink-0" />
                )}
                {revealedResult && isSelected && choice.id !== result?.correctChoiceId && (
                  <X className="text-destructive size-4 shrink-0" />
                )}
                <span>
                  {choice.label}. <MathText>{choice.content}</MathText>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Input
          className="h-11"
          placeholder="정답 입력"
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          disabled={result !== null}
        />
      )}

      {result === null ? (
        <Button
          type="button"
          size="lg"
          className="self-start"
          disabled={!canSubmit || isPending}
          onClick={() =>
            submit({ choiceId: selectedChoiceId ?? undefined, text: answerText || undefined })
          }
        >
          제출
        </Button>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-1 flex flex-col gap-2 duration-200">
          <p
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              result.correct ? "text-success" : "text-destructive",
            )}
          >
            {result.correct ? <Check className="size-4" /> : <X className="size-4" />}
            {result.correct ? "정답입니다!" : "오답입니다. 오답노트에 저장되었어요."}
          </p>
          {result.explanation && (
            <MathText className="text-muted-foreground text-xs">{result.explanation}</MathText>
          )}
          {nextCta}
        </div>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
