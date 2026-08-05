"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitExam } from "@/features/mock-exam/actions";
import { ExamTimer } from "@/features/mock-exam/components/exam-timer";
import { OmrSheet } from "@/features/mock-exam/components/omr-sheet";
import type { getMockExam } from "@/features/mock-exam/queries";

export function TakeExamView({
  exam,
}: {
  exam: NonNullable<Awaited<ReturnType<typeof getMockExam>>>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const handleSubmit = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const durationSec = Math.round((Date.now() - startedAt) / 1000);
        const result = await submitExam(exam.id, {
          durationSec,
          answers: exam.questions.map((question) => ({
            problemId: question.problem.id,
            choiceId: answers[question.problem.id],
          })),
        });
        router.push(`/mock-exam/${exam.id}/result?resultId=${result.examResultId}`);
      } catch {
        // Keep the in-progress answers so a network blip doesn't lose the
        // exam attempt — the user can just press submit again.
        setError("제출에 실패했습니다. 답안은 유지되어 있으니 다시 제출해주세요.");
      }
    });
  }, [answers, exam.id, exam.questions, router, startedAt]);

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{exam.title}</h1>
          <p className="text-muted-foreground text-xs">
            {answeredCount} / {exam.questions.length}문항 답변함
          </p>
        </div>
        <ExamTimer timeLimitSec={exam.timeLimitSec} onExpire={handleSubmit} />
      </div>

      <OmrSheet
        questions={exam.questions}
        answers={answers}
        onSelect={(problemId, choiceId) =>
          setAnswers((prev) => ({ ...prev, [problemId]: choiceId }))
        }
      />

      {error && <p className="text-destructive self-end text-xs">{error}</p>}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="self-end"
      >
        {isSubmitting ? "제출 중..." : "제출하기"}
      </Button>
    </div>
  );
}
