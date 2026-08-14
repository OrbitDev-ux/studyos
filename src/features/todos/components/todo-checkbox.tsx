"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTodo } from "@/features/todos/actions";
import { useI18n } from "@/features/i18n/provider";

export function TodoCheckbox({ id, completed }: { id: string; completed: boolean }) {
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();

  return (
    <Checkbox
      checked={completed}
      disabled={isPending}
      aria-label={messages.todos.checkboxLabel}
      onCheckedChange={() => startTransition(() => toggleTodo(id))}
    />
  );
}
