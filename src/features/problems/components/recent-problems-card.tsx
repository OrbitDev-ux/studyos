import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
import type { getRecentProblems } from "@/features/problems/queries";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import type { Messages } from "@/features/i18n/messages";

/**
 * Backed by getRecentProblems — plain createdAt-desc, no personalization.
 * Labeled "최근 문제" (recent), not "추천" (recommended): real recommendation
 * already lives in WeakProblemsCard, and mislabeling a recency list as a
 * recommendation misleads users about what the AI is actually doing.
 */
export function RecentProblemsCard({
  problems,
  t,
}: {
  problems: Awaited<ReturnType<typeof getRecentProblems>>;
  t: Messages["dashboard"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.recentProblemsTitle}</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/problems">{t.viewAll}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {problems.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.recentProblemsEmpty}</p>
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
