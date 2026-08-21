"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
import { createGoal, updateGoal } from "@/features/goals/actions";
import {
  goalFormSchema,
  type GoalFormInput,
  type GoalFormValues,
} from "@/features/goals/schema";
import { useI18n } from "@/features/i18n/provider";

type GoalFormDialogProps = {
  subjects: Subject[];
  trigger?: ReactNode;
  goal?: {
    id: string;
    title: string;
    targetValue: number;
    unit: string;
    subjectId: string | null;
  };
};

export function GoalFormDialog({ subjects, trigger, goal }: GoalFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!goal;
  const { messages } = useI18n();
  const t = messages.goals;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: goal?.title ?? "",
      targetValue: goal?.targetValue ?? 10,
      unit: goal?.unit ?? "개",
      subjectId: goal?.subjectId ?? undefined,
    },
  });

  async function onSubmit(values: GoalFormValues) {
    setError(null);
    try {
      if (isEdit) {
        await updateGoal(goal.id, values);
      } else {
        await createGoal(values);
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
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="sm" variant="outline" className="gap-1.5">
            <Plus className="size-4" />
            {t.add}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t.editTitle : t.addTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-title">{t.fieldTitle}</Label>
            <Input
              id="goal-title"
              placeholder={t.titlePlaceholder}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="goal-target">{t.fieldTarget}</Label>
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
              <Label htmlFor="goal-unit">{t.fieldUnit}</Label>
              <Input
                id="goal-unit"
                placeholder={t.unitPlaceholder}
                {...register("unit")}
              />
              {errors.unit && (
                <p className="text-destructive text-xs">{errors.unit.message}</p>
              )}
            </div>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>{t.fieldSubject}</Label>
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
