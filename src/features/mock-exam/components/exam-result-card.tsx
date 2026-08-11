import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
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
  const essayCount = orderedAnswers.filter((a) => a.problem.type === "ESSAY").length;

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
          {essayCount > 0 && (
            <p className="text-muted-foreground w-full text-xs">
              서술형 {essayCount}문항은 모범 답안과 비교해 스스로 확인하는 항목이며 점수에는
              포함되지 않아요.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {orderedAnswers.map((answer, index) => {
          const isEssay = answer.problem.type === "ESSAY";
          return (
            <Card key={answer.id}>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {index + 1}. <MathText>{answer.problem.prompt}</MathText>
                  </p>
                  {isEssay ? (
                    <Badge variant="outline">서술형</Badge>
                  ) : (
                    <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                      {answer.isCorrect ? "정답" : "오답"}
                    </Badge>
                  )}
                </div>

                {isEssay ? (
                  <div className="flex flex-col gap-2 text-sm">
                    {answer.answerText && (
                      <div className="bg-muted rounded-md p-2">
                        <p className="text-muted-foreground text-xs">내 답안</p>
                        <MathText>{answer.answerText}</MathText>
                      </div>
                    )}
                    {answer.problem.answerText && (
                      <div className="bg-primary/5 rounded-md p-2">
                        <p className="text-muted-foreground text-xs">모범 답안</p>
                        <MathText>{answer.problem.answerText}</MathText>
                      </div>
                    )}
                    {answer.problem.scoringCriteria && (
                      <div className="bg-muted rounded-md p-2">
                        <p className="text-muted-foreground text-xs">핵심 채점 요소</p>
                        <MathText className="text-muted-foreground">
                          {answer.problem.scoringCriteria}
                        </MathText>
                      </div>
                    )}
                  </div>
                ) : (
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
                        {choice.label}. <MathText>{choice.content}</MathText>
                        {choice.id === answer.selectedChoiceId && " (내 답)"}
                      </p>
                    ))}
                  </div>
                )}

                {answer.problem.explanation && (
                  <MathText className="text-muted-foreground text-xs">
                    {answer.problem.explanation}
                  </MathText>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
