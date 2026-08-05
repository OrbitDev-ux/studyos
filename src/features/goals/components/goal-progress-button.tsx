"use client";

import { Plus } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { incrementGoalProgress } from "@/features/goals/actions";

export function GoalProgressButton({
  goalId,
  disabled,
}: {
  goalId: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="outline"
      disabled={disabled || isPending}
      aria-label="진행도 1 추가"
      onClick={() => startTransition(() => incrementGoalProgress(goalId, 1))}
    >
      <Plus className="size-3.5" />
    </Button>
  );
}
