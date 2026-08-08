import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getDueReviews } from "@/features/review/queries";

export function TodayReviewCard({
  wrongAnswers,
  totalCount,
}: {
  wrongAnswers: Awaited<ReturnType<typeof getDueReviews>>;
  totalCount: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>오늘 복습</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/review">전체 보기</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {totalCount === 0 ? (
          <p className="text-muted-foreground text-sm">
            오늘 복습할 오답이 없어요. 잘하고 있어요!
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">복습 예정 {totalCount}개</p>
            <ul className="flex flex-col gap-1.5">
              {wrongAnswers.map((wrongAnswer) => (
                <li
                  key={wrongAnswer.id}
                  className="text-muted-foreground truncate text-sm"
                >
                  {wrongAnswer.problem.prompt}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
