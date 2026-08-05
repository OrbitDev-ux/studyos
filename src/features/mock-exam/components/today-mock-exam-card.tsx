import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getRecentMockExams } from "@/features/mock-exam/queries";

export function TodayMockExamCard({
  exams,
}: {
  exams: Awaited<ReturnType<typeof getRecentMockExams>>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>오늘 모의고사</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/mock-exam">전체 보기</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {exams.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 만든 모의고사가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {exams.map((exam) => {
              const latestResult = exam.results[0];
              return (
                <li
                  key={exam.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{exam.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {latestResult ? `${latestResult.score}점` : "미응시"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
