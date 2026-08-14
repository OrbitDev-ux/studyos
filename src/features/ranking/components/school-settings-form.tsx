"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSchool } from "@/features/ranking/actions";
import { schoolFormSchema, type SchoolFormValues } from "@/features/ranking/schema";
import { useI18n } from "@/features/i18n/provider";

export function SchoolSettingsForm() {
  const { messages } = useI18n();
  const t = messages.ranking;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: { school: "" },
  });

  async function onSubmit(values: SchoolFormValues) {
    await updateSchool(values.school);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t.schoolPrompt}</p>
      <div className="flex flex-col gap-1.5">
        <Input placeholder={t.schoolPlaceholder} {...register("school")} />
        {errors.school && (
          <p className="text-destructive text-xs">{errors.school.message}</p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting} className="self-start">
        {t.schoolSubmit}
      </Button>
    </form>
  );
}
