"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProblemCard } from "@/features/problems/components/problem-card";
import { ProblemGeneratorForm } from "@/features/problems/components/problem-generator-form";
import type { getProblems } from "@/features/problems/queries";

type Filter = "all" | "favorites";

export function ProblemList({
  problems,
}: {
  problems: Awaited<ReturnType<typeof getProblems>>;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filteredProblems = useMemo(() => {
    if (filter === "favorites") return problems.filter((p) => p.isFavorite);
    return problems;
  }, [problems, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="favorites">즐겨찾기</TabsTrigger>
          </TabsList>
        </Tabs>
        <ProblemGeneratorForm
          trigger={
            <Button type="button" size="sm" className="gap-1.5">
              <Sparkles className="size-4" />
              문제 생성
            </Button>
          }
        />
      </div>
      {filteredProblems.length === 0 ? (
        <p className="text-muted-foreground text-sm">표시할 문제가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProblems.map((problem, i) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              progress={{ index: i + 1, total: filteredProblems.length }}
              nextProblemId={filteredProblems[i + 1]?.id ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
