import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { getExamResult } from "@/features/mock-exam/queries";
import { cn } from "@/lib/utils";

export function ExamResultCard({
  result,
}: {
  result: NonNullable<Awaited<ReturnType<typeof getExamResult>>>;
}) {
  const orderedProblemIds = result.exam.questions.map((question) => question.problemId);
  const answerByProblemId = new Map(
    result.answers.map((answer) => [answer.problemId, answer]),
  );
  const orderedAnswers = orderedProblemIds
    .map((problemId) => answerByProblemId.get(problemId))
    .filter((answer) => answer !== undefined);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-muted-foreground text-xs">점수</p>
            <p className="text-2xl font-semibold">{result.score}점</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">정답</p>
            <p className="text-lg font-medium">
              {result.correctCount} / {result.totalCount}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">소요 시간</p>
            <p className="text-lg font-medium">{Math.round(result.durationSec / 60)}분</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {orderedAnswers.map((answer, index) => (
          <Card key={answer.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  {index + 1}. {answer.problem.prompt}
                </p>
                <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                  {answer.isCorrect ? "정답" : "오답"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                {answer.problem.choices.map((choice) => (
                  <p
                    key={choice.id}
                    className={cn(
                      choice.isCorrect && "text-primary font-medium",
                      choice.id === answer.selectedChoiceId &&
                        !choice.isCorrect &&
                        "text-destructive",
                    )}
                  >
                    {choice.label}. {choice.content}
                    {choice.id === answer.selectedChoiceId && " (내 답)"}
                  </p>
                ))}
              </div>
              {answer.problem.explanation && (
                <p className="text-muted-foreground text-xs">
                  {answer.problem.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
