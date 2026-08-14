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
import { useI18n } from "@/features/i18n/provider";

type SubjectFormDialogProps = {
  trigger: ReactNode;
  subject?: { id: string; name: string; color: string };
};

export function SubjectFormDialog({ trigger, subject }: SubjectFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!subject;
  const { messages } = useI18n();
  const t = messages.subjects;

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
      setError("name", { message: t.saveError });
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
          <DialogTitle>{isEdit ? t.edit : t.add}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-name">{t.nameLabel}</Label>
            <Input id="subject-name" placeholder={t.namePlaceholder} {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t.colorLabel}</Label>
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
              {isEdit ? t.submitSave : t.submitAdd}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
