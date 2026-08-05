import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { quickAddTodo } from "@/features/todos/actions";
import { TodoCheckbox } from "@/features/todos/components/todo-checkbox";
import type { getTodayTodos } from "@/features/todos/queries";
import { cn } from "@/lib/utils";

export function TodayTodosCard({
  todos,
}: {
  todos: Awaited<ReturnType<typeof getTodayTodos>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>오늘 Todo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={quickAddTodo} className="flex gap-2">
          <Input name="title" placeholder="할 일 추가" maxLength={200} required />
          <Button type="submit" size="icon" variant="outline" aria-label="추가">
            <Plus className="size-4" />
          </Button>
        </form>
        {todos.length === 0 ? (
          <p className="text-muted-foreground text-sm">오늘 할 일이 없습니다.</p>
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
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: `${todo.subject.color}1a`,
                      color: todo.subject.color,
                    }}
                  >
                    {todo.subject.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
