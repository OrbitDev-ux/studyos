"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabFeatureCard } from "@/features/lab/components/lab-feature-card";
import { recordLabImpressions } from "@/features/lab/actions";
import { LAB_CATEGORIES, type LabCategory, type LabStatus } from "@/features/lab/registry";
import { cn } from "@/lib/utils";

export type LabCardData = {
  key: string;
  name: string;
  emoji: string;
  description: string;
  status: LabStatus;
  category: LabCategory;
  cta: string;
  likes: number;
  dislikes: number;
  myVote: "LIKE" | "DISLIKE" | null;
};

export type LabBook = { id: string; title: string };

const FILTERS: (LabCategory | "전체")[] = ["전체", ...LAB_CATEGORIES];

export function LabBoard({ cards, books }: { cards: LabCardData[]; books: LabBook[] }) {
  const [filter, setFilter] = useState<LabCategory | "전체">("전체");

  // Impression tracking (once per view). Fire-and-forget; failures are ignored.
  useEffect(() => {
    if (cards.length > 0) void recordLabImpressions(cards.map((c) => c.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(
    () => (filter === "전체" ? cards : cards.filter((c) => c.category === filter)),
    [cards, filter],
  );

  if (cards.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border p-6 text-center text-sm">
        지금 사용할 수 있는 실험 기능이 없어요. 곧 새로운 기능을 준비할게요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      <div className={cn("flex flex-col gap-3")}>
        {visible.map((card) => (
          <LabFeatureCard key={card.key} card={card} books={books} />
        ))}
        {visible.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            이 분류에는 아직 실험 기능이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}
