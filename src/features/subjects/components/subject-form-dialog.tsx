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
import { ColorSwatchPicker } from "@/features/subjects/components/color-swatch-picker";
import { SUBJECT_COLOR_PALETTE } from "@/features/subjects/constants";
import { subjectFormSchema, type SubjectFormValues } from "@/features/subjects/schema";
import { createSubject, updateSubject } from "@/features/subjects/actions";

type SubjectFormDialogProps = {
  trigger: ReactNode;
  subject?: { id: string; name: string; color: string };
};

export function SubjectFormDialog({ trigger, subject }: SubjectFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!subject;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: subject?.name ?? "",
      color: subject?.color ?? SUBJECT_COLOR_PALETTE[0],
    },
  });

  async function onSubmit(values: SubjectFormValues) {
    try {
      const result = isEdit
        ? await updateSubject(subject.id, values)
        : await createSubject(values);

      if (result.error) {
        setError("name", { message: result.error });
        return;
      }

      reset();
      setOpen(false);
    } catch {
      setError("name", { message: "저장에 실패했습니다. 잠시 후 다시 시도해주세요." });
    }
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
          <DialogTitle>{isEdit ? "과목 수정" : "과목 추가"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-name">과목명</Label>
            <Input id="subject-name" placeholder="예: 사회" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>색상</Label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorSwatchPicker value={field.value} onChange={field.onChange} />
              )}
            />
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
