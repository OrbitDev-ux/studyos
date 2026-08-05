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
import { generateProblems } from "@/features/problems/actions";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/features/problems/constants";
import {
  problemGenerationFormSchema,
  type ProblemGenerationFormInput,
  type ProblemGenerationFormValues,
} from "@/features/problems/schema";
import type { Subject } from "@/generated/prisma/client";

export function ProblemGeneratorForm({
  subjects,
  trigger,
}: {
  subjects: Subject[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProblemGenerationFormInput, unknown, ProblemGenerationFormValues>({
    resolver: zodResolver(problemGenerationFormSchema),
    defaultValues: {
      subjectId: subjects[0]?.id ?? "",
      unit: "",
      difficulty: "MEDIUM",
      type: "MULTIPLE_CHOICE",
      count: 5,
    },
  });

  async function onSubmit(values: ProblemGenerationFormValues) {
    setError(null);
    try {
      await generateProblems(values);
      reset();
      setOpen(false);
    } catch {
      setError("문제 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
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
          <DialogTitle>AI 문제 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>과목</Label>
            <Controller
              control={control}
              name="subjectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="과목 선택" />
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
            {errors.subjectId && (
              <p className="text-destructive text-xs">{errors.subjectId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="problem-unit">단원 (선택)</Label>
            <Input id="problem-unit" placeholder="예: 이차함수" {...register("unit")} />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>난이도</Label>
              <Controller
                control={control}
                name="difficulty"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>유형</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="problem-count">문항 수</Label>
            <Input
              id="problem-count"
              type="number"
              min={1}
              max={10}
              {...register("count")}
            />
            {errors.count && (
              <p className="text-destructive text-xs">{errors.count.message}</p>
            )}
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || subjects.length === 0}>
              {isSubmitting ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
