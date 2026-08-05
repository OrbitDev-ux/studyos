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
  const [isSubmitting, startTransition] = useTransition();

  const handleSubmit = useCallback(() => {
    startTransition(async () => {
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      const result = await submitExam(exam.id, {
        durationSec,
        answers: exam.questions.map((question) => ({
          problemId: question.problem.id,
          choiceId: answers[question.problem.id],
        })),
      });
      router.push(`/mock-exam/${exam.id}/result?resultId=${result.examResultId}`);
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
