import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import { WrongAnswerActions } from "@/features/review/components/wrong-answer-actions";
import type { getWrongAnswers } from "@/features/review/queries";

export function WrongAnswerCard({
  wrongAnswer,
}: {
  wrongAnswer: Awaited<ReturnType<typeof getWrongAnswers>>[number];
}) {
  const { problem } = wrongAnswer;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {problem.subject && (
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: `${problem.subject.color}1a`,
                  color: problem.subject.color,
                }}
              >
                {problem.subject.name}
              </span>
            )}
            <Badge variant="outline">{DIFFICULTY_LABEL[problem.difficulty]}</Badge>
          </div>
          {wrongAnswer.resolved && <Badge>해결됨</Badge>}
        </div>

        <p className="text-sm font-medium">{problem.prompt}</p>

        <WrongAnswerActions wrongAnswer={wrongAnswer} />
      </CardContent>
    </Card>
  );
}
