"use client";

import { MoreVertical, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { MathText } from "@/components/ui/math-text";
import { FavoriteButton } from "@/features/problems/components/favorite-button";
import { SolveProblemPanel } from "@/features/problems/components/solve-problem-panel";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/features/problems/constants";
import type { BankProblem } from "@/features/study-bank/queries";
import { SubjectChip } from "@/features/subjects/components/subject-chip";

export function StudyBankCard({
  problem,
  owned,
}: {
  problem: BankProblem;
  /** Whether the current user owns this problem. Shared (imported) problems are
   * owned by the system account → 저장(즐겨찾기) is hidden since it is per-owner. */
  owned: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // 유사 문제: interface only for now (§14). A future POST /api/problems/:id/similar
  // (or the existing AI pipeline) plugs in here without UI changes.
  function requestSimilar() {
    toast({
      title: "유사 문제 생성은 곧 제공됩니다.",
      description: "현재 문제은행 단계에서는 준비 중인 기능이에요.",
    });
  }

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {problem.subject && (
              <SubjectChip name={problem.subject.name} color={problem.subject.color} />
            )}
            <Badge variant="outline">{DIFFICULTY_LABEL[problem.difficulty]}</Badge>
            <Badge variant="secondary">{QUESTION_TYPE_LABEL[problem.type]}</Badge>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {owned && (
              <FavoriteButton problemId={problem.id} isFavorite={problem.isFavorite} />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="문제 메뉴"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOpen(true)}>
                  문제 상세
                </DropdownMenuItem>
                <DropdownMenuItem onClick={requestSimilar}>
                  <Sparkles className="size-4" /> 유사 문제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {problem.unit && (
          <p className="text-muted-foreground text-xs">🏷 {problem.unit}</p>
        )}

        <MathText className="line-clamp-3 block text-sm font-medium">
          {problem.prompt}
        </MathText>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm">
                풀기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-base">문제 상세</DialogTitle>
              </DialogHeader>
              <ProblemDetail problem={problem} owned={owned} onSimilar={requestSimilar} />
            </DialogContent>
          </Dialog>
          <Button type="button" size="sm" variant="outline" onClick={requestSimilar}>
            <Sparkles className="size-4" /> 유사 문제
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProblemDetail({
  problem,
  owned,
  onSimilar,
}: {
  problem: BankProblem;
  owned: boolean;
  onSimilar: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {problem.subject && (
          <SubjectChip name={problem.subject.name} color={problem.subject.color} />
        )}
        <Badge variant="outline">{DIFFICULTY_LABEL[problem.difficulty]}</Badge>
        <Badge variant="secondary">{QUESTION_TYPE_LABEL[problem.type]}</Badge>
        {problem.unit && (
          <span className="text-muted-foreground text-xs">🏷 {problem.unit}</span>
        )}
      </div>

      <MathText className="text-sm font-medium">{problem.prompt}</MathText>

      {/* Reuses the existing solve panel → existing grading / ProblemAttempt /
          WrongAnswer / spaced-repetition path (no new solve system). */}
      <SolveProblemPanel problem={problem} />

      <div className="flex items-center gap-2 border-t pt-3">
        {owned && (
          <>
            <FavoriteButton problemId={problem.id} isFavorite={problem.isFavorite} />
            <span className="text-muted-foreground text-xs">저장</span>
          </>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={onSimilar}
        >
          <Sparkles className="size-4" /> 유사 문제
        </Button>
      </div>
    </div>
  );
}
