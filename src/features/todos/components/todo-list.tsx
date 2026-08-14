"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Subject } from "@/generated/prisma/client";
import { TodoFormDialog } from "@/features/todos/components/todo-form-dialog";
import { TodoRow } from "@/features/todos/components/todo-row";
import type { getAllTodos } from "@/features/todos/queries";
import { useI18n } from "@/features/i18n/provider";

type Filter = "all" | "active" | "completed";

export function TodoList({
  todos,
  subjects,
  defaultDueDate,
}: {
  todos: Awaited<ReturnType<typeof getAllTodos>>;
  subjects: Subject[];
  defaultDueDate: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const { messages, locale } = useI18n();
  const t = messages.todos;

  const filteredTodos = useMemo(() => {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  }, [todos, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="all">{t.tabAll}</TabsTrigger>
            <TabsTrigger value="active">{t.tabActive}</TabsTrigger>
            <TabsTrigger value="completed">{t.tabCompleted}</TabsTrigger>
          </TabsList>
        </Tabs>
        <TodoFormDialog
          subjects={subjects}
          defaultDueDate={defaultDueDate}
          trigger={
            <Button type="button" size="sm" className="gap-1.5">
              <Plus className="size-4" />
              {t.add}
            </Button>
          }
        />
      </div>
      {filteredTodos.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredTodos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              subjects={subjects}
              defaultDueDate={defaultDueDate}
              editLabel={t.editLabel}
              locale={locale}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
