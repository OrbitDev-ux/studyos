import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
import type { getDueReviews } from "@/features/review/queries";
import type { Messages } from "@/features/i18n/messages";

export function TodayReviewCard({
  wrongAnswers,
  totalCount,
  t,
}: {
  wrongAnswers: Awaited<ReturnType<typeof getDueReviews>>;
  totalCount: number;
  t: Messages["dashboard"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.todayReviewTitle}</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/review">{t.viewAll}</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {totalCount === 0 ? (
          <p className="text-muted-foreground text-sm">{t.todayReviewEmpty}</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {t.todayReviewCount.replace("{count}", String(totalCount))}
            </p>
            <ul className="flex flex-col gap-1.5">
              {wrongAnswers.map((wrongAnswer) => (
                <li key={wrongAnswer.id} className="text-sm">
                  <MathText className="text-muted-foreground block truncate">
                    {wrongAnswer.problem.prompt}
                  </MathText>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
