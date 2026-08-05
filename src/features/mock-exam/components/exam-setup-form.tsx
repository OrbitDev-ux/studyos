"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import { generateMockExam } from "@/features/mock-exam/actions";
import {
  mockExamGenerationFormSchema,
  type MockExamGenerationFormInput,
  type MockExamGenerationFormValues,
} from "@/features/mock-exam/schema";
import type { Subject } from "@/generated/prisma/client";

export function ExamSetupForm({
  subjects,
  trigger,
}: {
  subjects: Subject[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MockExamGenerationFormInput, unknown, MockExamGenerationFormValues>({
    resolver: zodResolver(mockExamGenerationFormSchema),
    defaultValues: {
      subjectId: subjects[0]?.id ?? "",
      style: "",
      count: 10,
      timeLimitMinutes: 30,
    },
  });

  async function onSubmit(values: MockExamGenerationFormValues) {
    setError(null);
    try {
      const examId = await generateMockExam(values);
      reset();
      setOpen(false);
      router.push(`/mock-exam/${examId}`);
    } catch {
      setError("모의고사 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
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
          <DialogTitle>모의고사 생성</DialogTitle>
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
            <Label htmlFor="exam-style">스타일 (선택)</Label>
            <Input id="exam-style" placeholder="예: 평가원" {...register("style")} />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="exam-count">문항 수</Label>
              <Input
                id="exam-count"
                type="number"
                min={5}
                max={50}
                {...register("count")}
              />
              {errors.count && (
                <p className="text-destructive text-xs">{errors.count.message}</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="exam-time">제한 시간(분)</Label>
              <Input
                id="exam-time"
                type="number"
                min={5}
                max={180}
                {...register("timeLimitMinutes")}
              />
              {errors.timeLimitMinutes && (
                <p className="text-destructive text-xs">
                  {errors.timeLimitMinutes.message}
                </p>
              )}
            </div>
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
