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
import {
  getCurriculumOption,
  listGrades,
  listSubjects,
  listUnits,
} from "@/features/curriculum/taxonomy";

// Curriculum-driven defaults: preselect the first valid (grade → subject → unit)
// path so the form is submittable immediately and never starts in an invalid
// state.
const GRADES = listGrades();
const CURRICULUM = getCurriculumOption();
const FIRST_GRADE = GRADES[0]?.id ?? "";
const FIRST_SUBJECT = listSubjects(FIRST_GRADE)[0]?.id ?? "";
const FIRST_UNIT = listUnits(FIRST_GRADE, FIRST_SUBJECT)[0]?.id ?? "";

export function ProblemGeneratorForm({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProblemGenerationFormInput, unknown, ProblemGenerationFormValues>({
    resolver: zodResolver(problemGenerationFormSchema),
    defaultValues: {
      gradeId: FIRST_GRADE,
      subjectId: FIRST_SUBJECT,
      unitId: FIRST_UNIT,
      difficulty: "MEDIUM",
      type: "MULTIPLE_CHOICE",
      count: 5,
    },
  });

  // Dependent option lists follow the current grade/subject selection.
  const gradeId = watch("gradeId");
  const subjectId = watch("subjectId");
  const subjectOptions = listSubjects(gradeId);
  const unitOptions = listUnits(gradeId, subjectId);

  async function onSubmit(values: ProblemGenerationFormValues) {
    setError(null);
    try {
      const result = await generateProblems(values);
      if (result?.error) {
        setError(result.error);
        return;
      }
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
            <Label>학년</Label>
            <Controller
              control={control}
              name="gradeId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(next) => {
                    field.onChange(next);
                    // Reset dependent selections to the first valid child so the
                    // path never points at a subject/unit from another grade.
                    const firstSubject = listSubjects(next)[0]?.id ?? "";
                    setValue("subjectId", firstSubject);
                    setValue("unitId", listUnits(next, firstSubject)[0]?.id ?? "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gradeId && (
              <p className="text-destructive text-xs">{errors.gradeId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>교육과정</Label>
            {/* Single curriculum for now — shown for context, fixed. */}
            <Select value={CURRICULUM.id} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CURRICULUM.id}>{CURRICULUM.name}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>과목</Label>
            <Controller
              control={control}
              name="subjectId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(next) => {
                    field.onChange(next);
                    setValue("unitId", listUnits(gradeId, next)[0]?.id ?? "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="과목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((subject) => (
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
            <Label>단원</Label>
            <Controller
              control={control}
              name="unitId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="단원 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.unitId && (
              <p className="text-destructive text-xs">{errors.unitId.message}</p>
            )}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
