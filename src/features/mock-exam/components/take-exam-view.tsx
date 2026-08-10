"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  // Guards against a double submission: the manual 제출 button and the timer's
  // onExpire both call handleSubmit, and they can race (click at 0:01 + expiry).
  // Without this, two submitExam calls create duplicate ExamResult + duplicate
  // ProblemAttempt rows (inflating learning stats). Reset on failure so the
  // keep-your-answers retry path still works.
  const submittedRef = useRef(false);

  const mcQuestions = useMemo(
    () => exam.questions.filter((q) => q.problem.type === "MULTIPLE_CHOICE"),
    [exam.questions],
  );
  const essayQuestions = useMemo(
    () => exam.questions.filter((q) => q.problem.type === "ESSAY"),
    [exam.questions],
  );

  const handleSubmit = useCallback(() => {
    // Idempotency guard — see submittedRef above. A second call (double-click or
    // click racing the timer expiry) is ignored while one submission is live.
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const durationSec = Math.round((Date.now() - startedAt) / 1000);
        const result = await submitExam(exam.id, {
          durationSec,
          answers: [
            ...mcQuestions.map((q) => ({
              problemId: q.problem.id,
              choiceId: answers[q.problem.id],
            })),
            ...essayQuestions.map((q) => ({
              problemId: q.problem.id,
              text: essayAnswers[q.problem.id],
            })),
          ],
        });
        router.push(`/mock-exam/${exam.id}/result?resultId=${result.examResultId}`);
      } catch {
        // Keep the in-progress answers so a network blip doesn't lose the
        // exam attempt — the user can just press submit again. Release the guard
        // so that retry is allowed (a successful submit navigates away instead).
        submittedRef.current = false;
        setError("제출에 실패했습니다. 답안은 유지되어 있으니 다시 제출해주세요.");
      }
    });
  }, [answers, essayAnswers, exam.id, mcQuestions, essayQuestions, router, startedAt]);

  const answeredCount =
    Object.keys(answers).length +
    Object.values(essayAnswers).filter((v) => v.trim().length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{exam.title}</h1>
          <p className="text-muted-foreground text-xs">
            {answeredCount} / {exam.questions.length}문항 답변함
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/mock-exam/${exam.id}/paper`}>
              <Printer className="size-4" />
              시험지
            </Link>
          </Button>
          <ExamTimer timeLimitSec={exam.timeLimitSec} onExpire={handleSubmit} />
        </div>
      </div>

      <OmrSheet
        questions={mcQuestions}
        answers={answers}
        onSelect={(problemId, choiceId) =>
          setAnswers((prev) => ({ ...prev, [problemId]: choiceId }))
        }
      />

      {essayQuestions.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">서술형</h2>
          {essayQuestions.map((question, index) => (
            <Card key={question.id}>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm font-medium whitespace-pre-wrap">
                  {mcQuestions.length + index + 1}. {question.problem.prompt}
                </p>
                <Textarea
                  rows={5}
                  placeholder="풀이 과정과 답을 서술하세요."
                  value={essayAnswers[question.problem.id] ?? ""}
                  onChange={(e) =>
                    setEssayAnswers((prev) => ({
                      ...prev,
                      [question.problem.id]: e.target.value,
                    }))
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
