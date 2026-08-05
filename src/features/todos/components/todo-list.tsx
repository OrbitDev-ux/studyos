"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Subject } from "@/generated/prisma/client";
import { TodoFormDialog } from "@/features/todos/components/todo-form-dialog";
import { TodoRow } from "@/features/todos/components/todo-row";
import type { getAllTodos } from "@/features/todos/queries";

type Filter = "all" | "active" | "completed";

export function TodoList({
  todos,
  subjects,
}: {
  todos: Awaited<ReturnType<typeof getAllTodos>>;
  subjects: Subject[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

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
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="active">미완료</TabsTrigger>
            <TabsTrigger value="completed">완료</TabsTrigger>
          </TabsList>
        </Tabs>
        <TodoFormDialog
          subjects={subjects}
          trigger={
            <Button type="button" size="sm" className="gap-1.5">
              <Plus className="size-4" />할 일 추가
            </Button>
          }
        />
      </div>
      {filteredTodos.length === 0 ? (
        <p className="text-muted-foreground text-sm">표시할 할 일이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredTodos.map((todo) => (
            <TodoRow key={todo.id} todo={todo} subjects={subjects} />
          ))}
        </ul>
      )}
    </div>
  );
}
