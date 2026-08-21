import { Card, CardContent } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
import { DeleteProblemButton } from "@/features/problems/components/delete-problem-button";
import { FavoriteButton } from "@/features/problems/components/favorite-button";
import { ProblemMeta } from "@/features/problems/components/problem-meta";
import {
  SolveProblemPanel,
  type SolveProgress,
} from "@/features/problems/components/solve-problem-panel";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import type { ProblemWithRelations } from "@/features/problems/queries";

export function ProblemCard({
  problem,
  progress,
  nextProblemId,
}: {
  problem: ProblemWithRelations;
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
            <ProblemMeta
              difficulty={problem.difficulty}
              type={problem.type}
              unit={problem.unit}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <FavoriteButton problemId={problem.id} isFavorite={problem.isFavorite} />
            <DeleteProblemButton problemId={problem.id} />
          </div>
        </div>

        <MathText className="text-sm font-medium">{problem.prompt}</MathText>

        <SolveProblemPanel
          problem={problem}
          progress={progress}
          nextProblemId={nextProblemId}
        />
      </CardContent>
    </Card>
  );
}
