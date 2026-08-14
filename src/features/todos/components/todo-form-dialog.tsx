"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subject } from "@/generated/prisma/client";
import { createTodo, updateTodo } from "@/features/todos/actions";
import { todoFormSchema, type TodoFormValues } from "@/features/todos/schema";
import { useI18n } from "@/features/i18n/provider";

type TodoFormDialogProps = {
  subjects: Subject[];
  trigger: ReactNode;
  /**
   * "YYYY-MM-DD" for the new-todo default, computed server-side from the
   * user's timezone (getZonedDateOnly) — deriving "today" from the browser's
   * local clock instead would silently disagree with the server-rendered
   * default whenever the visitor's local date differs from UTC, the same
   * class of bug the @db.Date helpers in lib/date.ts exist to prevent.
   */
  defaultDueDate: string;
  todo?: {
    id: string;
    title: string;
    subjectId: string | null;
    dueDate: string;
  };
};

export function TodoFormDialog({
  subjects,
  trigger,
  defaultDueDate,
  todo,
}: TodoFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!todo;
  const { messages } = useI18n();
  const t = messages.todos;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: todo?.title ?? "",
      subjectId: todo?.subjectId ?? undefined,
      dueDate: todo?.dueDate ?? defaultDueDate,
    },
  });

  async function onSubmit(values: TodoFormValues) {
    setError(null);
    try {
      if (isEdit) {
        await updateTodo(todo.id, values);
      } else {
        await createTodo(values);
      }
      reset();
      setOpen(false);
    } catch {
      setError(t.saveError);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t.edit : t.add}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="todo-title">{t.fieldTitle}</Label>
            <Input
              id="todo-title"
              placeholder={t.titlePlaceholder}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="todo-due-date">{t.dateLabel}</Label>
              <Input id="todo-due-date" type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-destructive text-xs">{errors.dueDate.message}</p>
              )}
            </div>
            {subjects.length > 0 && (
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>{t.subjectLabel}</Label>
                <Controller
                  control={control}
                  name="subjectId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.subjectPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? t.submitSave : t.submitAdd}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
