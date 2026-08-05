"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTodo } from "@/features/todos/actions";

export function TodoCheckbox({ id, completed }: { id: string; completed: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Checkbox
      checked={completed}
      disabled={isPending}
      aria-label="완료 표시"
      onCheckedChange={() => startTransition(() => toggleTodo(id))}
    />
  );
}
