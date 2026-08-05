"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
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
import { createGoal } from "@/features/goals/actions";
import {
  goalFormSchema,
  type GoalFormInput,
  type GoalFormValues,
} from "@/features/goals/schema";

export function CreateGoalDialog({ subjects }: { subjects: Subject[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { title: "", targetValue: 10, unit: "개", subjectId: undefined },
  });

  async function onSubmit(values: GoalFormValues) {
    await createGoal(values);
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
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-1.5">
          <Plus className="size-4" />
          목표 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>오늘 목표 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-title">목표</Label>
            <Input
              id="goal-title"
              placeholder="예: 영어 단어 100개"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="goal-target">목표량</Label>
              <Input
                id="goal-target"
                type="number"
                min={1}
                {...register("targetValue")}
              />
              {errors.targetValue && (
                <p className="text-destructive text-xs">{errors.targetValue.message}</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="goal-unit">단위</Label>
              <Input
                id="goal-unit"
                placeholder="개 / 문제 / 페이지"
                {...register("unit")}
              />
              {errors.unit && (
                <p className="text-destructive text-xs">{errors.unit.message}</p>
              )}
            </div>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>과목 (선택)</Label>
              <Controller
                control={control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="과목 선택 안 함" />
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
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              추가
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
