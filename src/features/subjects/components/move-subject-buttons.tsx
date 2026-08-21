"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { moveSubject } from "@/features/subjects/actions";
import { useI18n } from "@/features/i18n/provider";

export function MoveSubjectButtons({
  subjectId,
  isFirst,
  isLast,
}: {
  subjectId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.subjects;

  return (
    <div className="flex flex-col">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="h-4"
        disabled={isFirst || isPending}
        aria-label={t.moveUp}
        onClick={() => startTransition(() => moveSubject(subjectId, "up"))}
      >
        <ChevronUp className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="h-4"
        disabled={isLast || isPending}
        aria-label={t.moveDown}
        onClick={() => startTransition(() => moveSubject(subjectId, "down"))}
      >
        <ChevronDown className="size-3.5" />
      </Button>
    </div>
  );
}
