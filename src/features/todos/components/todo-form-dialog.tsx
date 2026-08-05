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

function getBrowserToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type TodoFormDialogProps = {
  subjects: Subject[];
  trigger: ReactNode;
  todo?: {
    id: string;
    title: string;
    subjectId: string | null;
    dueDate: string;
  };
};

export function TodoFormDialog({ subjects, trigger, todo }: TodoFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!todo;

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
      dueDate: todo?.dueDate ?? getBrowserToday(),
    },
  });

  async function onSubmit(values: TodoFormValues) {
    if (isEdit) {
      await updateTodo(todo.id, values);
    } else {
      await createTodo(values);
    }
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "할 일 수정" : "할 일 추가"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="todo-title">할 일</Label>
            <Input
              id="todo-title"
              placeholder="예: 수학 문제집 3단원"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="todo-due-date">날짜</Label>
              <Input id="todo-due-date" type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-destructive text-xs">{errors.dueDate.message}</p>
              )}
            </div>
            {subjects.length > 0 && (
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>과목 (선택)</Label>
                <Controller
                  control={control}
                  name="subjectId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택 안 함" />
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
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "저장" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
