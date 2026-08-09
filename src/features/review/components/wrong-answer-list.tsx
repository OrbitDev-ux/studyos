"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WrongAnswerCard } from "@/features/review/components/wrong-answer-card";
import type { getWrongAnswers } from "@/features/review/queries";

type Filter = "unresolved" | "all" | "resolved";

export function WrongAnswerList({
  wrongAnswers,
  canUseDna,
}: {
  wrongAnswers: Awaited<ReturnType<typeof getWrongAnswers>>;
  /** Whether the current plan may run 오답 DNA analysis (PRO+). */
  canUseDna: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("unresolved");

  const filtered = useMemo(() => {
    if (filter === "unresolved") return wrongAnswers.filter((w) => !w.resolved);
    if (filter === "resolved") return wrongAnswers.filter((w) => w.resolved);
    return wrongAnswers;
  }, [wrongAnswers, filter]);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList>
          <TabsTrigger value="unresolved">미해결</TabsTrigger>
          <TabsTrigger value="resolved">해결</TabsTrigger>
          <TabsTrigger value="all">전체</TabsTrigger>
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">표시할 오답이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((wrongAnswer) => (
            <WrongAnswerCard
              key={wrongAnswer.id}
              wrongAnswer={wrongAnswer}
              canUseDna={canUseDna}
            />
          ))}
        </div>
      )}
    </div>
  );
}
