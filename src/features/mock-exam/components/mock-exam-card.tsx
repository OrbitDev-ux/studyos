import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { getMockExams } from "@/features/mock-exam/queries";

export function MockExamCard({
  exam,
}: {
  exam: Awaited<ReturnType<typeof getMockExams>>[number];
}) {
  const latestResult = exam.results[0];

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{exam.title}</p>
          <p className="text-muted-foreground text-xs">
            {exam._count.questions}문항 · {Math.round(exam.timeLimitSec / 60)}분
            {latestResult && ` · 최근 점수 ${latestResult.score}점`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/mock-exam/${exam.id}/paper`}>시험지</Link>
          </Button>
          {latestResult && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/mock-exam/${exam.id}/result?resultId=${latestResult.id}`}>
                결과 보기
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href={`/mock-exam/${exam.id}`}>
              {latestResult ? "다시 풀기" : "응시하기"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
