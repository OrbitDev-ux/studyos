import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
import { ProblemMeta } from "@/features/problems/components/problem-meta";
import { WrongAnswerActions } from "@/features/review/components/wrong-answer-actions";
import { ERROR_TYPE_LABEL, toErrorType } from "@/features/review/dna";
import type { getWrongAnswers } from "@/features/review/queries";
import { SubjectChip } from "@/features/subjects/components/subject-chip";

export function WrongAnswerCard({
  wrongAnswer,
  canUseDna,
}: {
  wrongAnswer: Awaited<ReturnType<typeof getWrongAnswers>>[number];
  canUseDna: boolean;
}) {
  const { problem } = wrongAnswer;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {problem.subject && (
              <SubjectChip name={problem.subject.name} color={problem.subject.color} />
            )}
            <ProblemMeta
              difficulty={problem.difficulty}
              type={problem.type}
              unit={problem.unit}
            />
            {wrongAnswer.errorType && (
              <Badge variant="destructive">
                {ERROR_TYPE_LABEL[toErrorType(wrongAnswer.errorType)]}
              </Badge>
            )}
          </div>
          {wrongAnswer.resolved && <Badge>해결됨</Badge>}
        </div>

        <MathText className="text-sm font-medium">{problem.prompt}</MathText>

        <WrongAnswerActions wrongAnswer={wrongAnswer} canUseDna={canUseDna} />
      </CardContent>
    </Card>
  );
}
