"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProblemCard } from "@/features/problems/components/problem-card";
import { ProblemGeneratorForm } from "@/features/problems/components/problem-generator-form";
import type { getProblems } from "@/features/problems/queries";
import type { Subject } from "@/generated/prisma/client";

type Filter = "all" | "favorites";

export function ProblemList({
  problems,
  subjects,
}: {
  problems: Awaited<ReturnType<typeof getProblems>>;
  subjects: Subject[];
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
          subjects={subjects}
          trigger={
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={subjects.length === 0}
            >
              <Sparkles className="size-4" />
              문제 생성
            </Button>
          }
        />
      </div>
      {subjects.length === 0 && (
        <p className="text-muted-foreground text-sm">
          문제를 생성하려면 먼저 과목을 추가해주세요.
        </p>
      )}
      {filteredProblems.length === 0 ? (
        <p className="text-muted-foreground text-sm">표시할 문제가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProblems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      )}
    </div>
  );
}
