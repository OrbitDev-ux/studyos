import Link from "next/link";
import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import type { WeakProblemBoard } from "@/features/learning/weak-problems-queries";
import type { Messages } from "@/features/i18n/messages";

/**
 * 오늘의 약점 문제. Lists real recommended problems (with a human-readable reason)
 * chosen from the user's learning state. All values come from getWeakProblemBoard
 * — no fabricated mastery/accuracy. New users see a first-step empty state.
 */
export function WeakProblemsCard({ board, t }: { board: WeakProblemBoard; t: Messages["dashboard"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="size-4" /> {t.weakProblemsTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!board.hasData ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">{t.weakProblemsEmpty}</p>
            <Button asChild size="sm">
              <Link href="/problems">{t.weakProblemsEmptyCta}</Link>
            </Button>
          </div>
        ) : board.recommendations.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.weakProblemsNone}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {board.recommendations.map((rec) => (
                <li key={rec.problemId} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {rec.unit && rec.unit !== "미지정"
                        ? rec.unit
                        : (rec.subjectName ?? "추천 문제")}
                    </span>
                    <Badge variant="outline">{DIFFICULTY_LABEL[rec.difficulty]}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{rec.reason}</p>
                </li>
              ))}
            </ul>
            <Button asChild size="sm" className="self-start">
              <Link href="/problems">{t.weakProblemsCta}</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
