import Link from "next/link";
import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import type { WeakProblemBoard } from "@/features/learning/weak-problems-queries";

/**
 * 오늘의 약점 문제. Lists real recommended problems (with a human-readable reason)
 * chosen from the user's learning state. All values come from getWeakProblemBoard
 * — no fabricated mastery/accuracy. New users see a first-step empty state.
 */
export function WeakProblemsCard({ board }: { board: WeakProblemBoard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="size-4" /> 오늘의 약점 문제
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!board.hasData ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              아직 분석할 학습 데이터가 없어요. 문제를 몇 개 풀면 StudyOS가 여러분의 약점을 분석해드려요.
            </p>
            <Button asChild size="sm">
              <Link href="/problems">첫 문제 풀기</Link>
            </Button>
          </div>
        ) : board.recommendations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            오늘 추천할 약점 문제가 없어요. 잘하고 있어요!
          </p>
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
              <Link href="/problems">문제 풀기</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
