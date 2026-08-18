"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProblemCard } from "@/features/problems/components/problem-card";
import { ProblemGeneratorForm } from "@/features/problems/components/problem-generator-form";
import { useI18n } from "@/features/i18n/provider";
import type { getProblems } from "@/features/problems/queries";

type Filter = "all" | "favorites";

export function ProblemList({
  problems,
}: {
  problems: Awaited<ReturnType<typeof getProblems>>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const t = useI18n().messages.problems;

  const filteredProblems = useMemo(() => {
    if (filter === "favorites") return problems.filter((p) => p.isFavorite);
    return problems;
  }, [problems, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="all">{t.all}</TabsTrigger>
            <TabsTrigger value="favorites">{t.favorites}</TabsTrigger>
          </TabsList>
        </Tabs>
        <ProblemGeneratorForm
          trigger={
            <Button type="button" size="sm" className="gap-1.5">
              <Sparkles className="size-4" />
              {t.generate}
            </Button>
          }
        />
      </div>
      {filteredProblems.length === 0 ? (
        <div className="bg-muted/20 flex flex-col items-center gap-2 rounded-xl border border-dashed px-5 py-12 text-center">
          <Sparkles className="text-muted-foreground size-5" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">{t.empty}</p>
        </div>
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
