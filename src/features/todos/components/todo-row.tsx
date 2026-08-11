import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Subject } from "@/generated/prisma/client";
import { DeleteTodoButton } from "@/features/todos/components/delete-todo-button";
import { TodoCheckbox } from "@/features/todos/components/todo-checkbox";
import { TodoFormDialog } from "@/features/todos/components/todo-form-dialog";
import type { getAllTodos } from "@/features/todos/queries";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import { formatDateOnly, formatShortKoreanDate } from "@/lib/date";
import { cn } from "@/lib/utils";

export function TodoRow({
  todo,
  subjects,
  defaultDueDate,
}: {
  todo: Awaited<ReturnType<typeof getAllTodos>>[number];
  subjects: Subject[];
  defaultDueDate: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <TodoCheckbox id={todo.id} completed={todo.completed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-sm",
            todo.completed && "text-muted-foreground line-through",
          )}
        >
          {todo.title}
        </span>
        <span className="text-muted-foreground text-xs">
          {formatShortKoreanDate(todo.dueDate)}
        </span>
      </div>
      {todo.subject && (
        <SubjectChip
          name={todo.subject.name}
          color={todo.subject.color}
          className="shrink-0"
        />
      )}
      <TodoFormDialog
        subjects={subjects}
        defaultDueDate={defaultDueDate}
        todo={{
          id: todo.id,
          title: todo.title,
          subjectId: todo.subjectId,
          dueDate: formatDateOnly(todo.dueDate),
        }}
        trigger={
          <Button type="button" size="icon-sm" variant="ghost" aria-label="수정">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DeleteTodoButton todoId={todo.id} />
    </li>
  );
}
