import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteProblemButton } from "@/features/problems/components/delete-problem-button";
import { FavoriteButton } from "@/features/problems/components/favorite-button";
import {
  SolveProblemPanel,
  type SolveProgress,
} from "@/features/problems/components/solve-problem-panel";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import type { getProblems } from "@/features/problems/queries";

export function ProblemCard({
  problem,
  progress,
  nextProblemId,
}: {
  problem: Awaited<ReturnType<typeof getProblems>>[number];
  progress?: SolveProgress;
  nextProblemId?: string | null;
}) {
  return (
    <Card id={`problem-${problem.id}`} className="scroll-mt-20 outline-none">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {problem.subject && (
              <SubjectChip name={problem.subject.name} color={problem.subject.color} />
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

        <SolveProblemPanel
          problem={problem}
          progress={progress}
          nextProblemId={nextProblemId}
        />
      </CardContent>
    </Card>
  );
}
