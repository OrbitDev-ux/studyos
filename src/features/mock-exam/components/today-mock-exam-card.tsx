import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getRecentMockExams } from "@/features/mock-exam/queries";
import type { Messages } from "@/features/i18n/messages";

export function TodayMockExamCard({
  exams,
  t,
}: {
  exams: Awaited<ReturnType<typeof getRecentMockExams>>;
  t: Messages["dashboard"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.todayMockExamTitle}</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/mock-exam">{t.viewAll}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {exams.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.todayMockExamEmpty}</p>
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
                    {latestResult
                      ? t.todayMockExamScore.replace("{score}", String(latestResult.score))
                      : t.todayMockExamNotTaken}
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
