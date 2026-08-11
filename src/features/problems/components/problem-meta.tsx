import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/features/problems/constants";
import { cn } from "@/lib/utils";
import type { Difficulty, QuestionType } from "@/generated/prisma/client";

/**
 * The single shared per-problem metadata row. Shows difficulty and 출제 유형
 * (question type) from the existing Problem taxonomy — no new fields, no
 * duplicate enums.
 *
 * Accuracy is shown ONLY when a real, measured value is passed (`accuracy` in
 * 0..1 with `attemptCount > 0`) → rendered as "정답률". We never fabricate a rate:
 * there is no AI-estimated accuracy in the schema, so when no attempts exist the
 * stat is simply hidden. This keeps the label honest ("정답률" = real data only).
 *
 * `unit` (단원) is the closest real "출제 패턴/영역" signal we store, shown when present.
 */
export function ProblemMeta({
  difficulty,
  type,
  unit,
  accuracy,
  attemptCount,
  className,
}: {
  difficulty: Difficulty;
  type?: QuestionType | null;
  unit?: string | null;
  /** Real solve rate in 0..1, computed from actual attempts. Omit if unknown. */
  accuracy?: number | null;
  /** Number of attempts behind `accuracy`. Accuracy hides when this is 0/absent. */
  attemptCount?: number | null;
  className?: string;
}) {
  const hasRealAccuracy =
    typeof accuracy === "number" &&
    Number.isFinite(accuracy) &&
    (attemptCount ?? 0) > 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge variant="outline">{DIFFICULTY_LABEL[difficulty]}</Badge>
      {type && <Badge variant="outline">{QUESTION_TYPE_LABEL[type]}</Badge>}
      {unit && <span className="text-muted-foreground text-xs">{unit}</span>}
      {hasRealAccuracy && (
        <span className="text-muted-foreground text-xs tabular-nums">
          정답률 {Math.round(accuracy! * 100)}%
        </span>
      )}
    </div>
  );
}
