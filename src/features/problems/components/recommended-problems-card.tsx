import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
import type { getRecentProblems } from "@/features/problems/queries";
import { SubjectChip } from "@/features/subjects/components/subject-chip";

export function RecommendedProblemsCard({
  problems,
}: {
  problems: Awaited<ReturnType<typeof getRecentProblems>>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>오늘 추천 문제</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/problems">전체 보기</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {problems.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            아직 생성한 문제가 없어요. 문제를 만들어 연습해보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {problems.map((problem) => (
              <li key={problem.id} className="flex items-center gap-2 text-sm">
                {problem.subject && (
                  <SubjectChip
                    name={problem.subject.name}
                    color={problem.subject.color}
                    className="shrink-0"
                  />
                )}
                <MathText className="block truncate">{problem.prompt}</MathText>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
