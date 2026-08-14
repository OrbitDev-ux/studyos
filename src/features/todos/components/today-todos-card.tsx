import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { quickAddTodo } from "@/features/todos/actions";
import { TodoCheckbox } from "@/features/todos/components/todo-checkbox";
import type { getTodayTodos } from "@/features/todos/queries";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import type { Messages } from "@/features/i18n/messages";
import { cn } from "@/lib/utils";

export function TodayTodosCard({
  todos,
  t,
}: {
  todos: Awaited<ReturnType<typeof getTodayTodos>>;
  t: Messages["todos"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.todayTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={quickAddTodo} className="flex gap-2">
          <Input name="title" placeholder={t.add} maxLength={200} required />
          <Button type="submit" size="icon" variant="outline" aria-label={t.submitAdd}>
            <Plus className="size-4" />
          </Button>
        </form>
        {todos.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.todayEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {todos.map((todo) => (
              <li key={todo.id} className="flex items-center gap-2.5">
                <TodoCheckbox id={todo.id} completed={todo.completed} />
                <span
                  className={cn(
                    "text-sm",
                    todo.completed && "text-muted-foreground line-through",
                  )}
                >
                  {todo.title}
                </span>
                {todo.subject && (
                  <SubjectChip
                    name={todo.subject.name}
                    color={todo.subject.color}
                    className="ml-auto"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
