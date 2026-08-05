import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteProblemButton } from "@/features/problems/components/delete-problem-button";
import { FavoriteButton } from "@/features/problems/components/favorite-button";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import type { getProblems } from "@/features/problems/queries";
import { cn } from "@/lib/utils";

export function ProblemCard({
  problem,
}: {
  problem: Awaited<ReturnType<typeof getProblems>>[number];
}) {
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
            {problem.unit && (
              <span className="text-muted-foreground text-xs">{problem.unit}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <FavoriteButton problemId={problem.id} isFavorite={problem.isFavorite} />
            <DeleteProblemButton problemId={problem.id} />
          </div>
        </div>

        <p className="text-sm font-medium">{problem.prompt}</p>

        {problem.choices.length > 0 && (
          <ul className="flex flex-col gap-1">
            {problem.choices.map((choice) => (
              <li
                key={choice.id}
                className={cn("text-sm", choice.isCorrect && "text-primary font-medium")}
              >
                {choice.label}. {choice.content}
              </li>
            ))}
          </ul>
        )}

        {problem.answerText && (
          <p className="text-sm">
            <span className="text-muted-foreground">정답: </span>
            {problem.answerText}
          </p>
        )}

        {problem.explanation && (
          <p className="text-muted-foreground text-xs">{problem.explanation}</p>
        )}
      </CardContent>
    </Card>
  );
}
