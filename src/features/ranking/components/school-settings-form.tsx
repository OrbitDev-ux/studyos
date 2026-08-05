"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSchool } from "@/features/ranking/actions";
import { schoolFormSchema, type SchoolFormValues } from "@/features/ranking/schema";

export function SchoolSettingsForm() {
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
      <p className="text-muted-foreground text-sm">
        학교를 설정하면 같은 학교 친구들과 랭킹을 비교할 수 있어요.
      </p>
      <div className="flex flex-col gap-1.5">
        <Input placeholder="학교명" {...register("school")} />
        {errors.school && (
          <p className="text-destructive text-xs">{errors.school.message}</p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting} className="self-start">
        학교 설정
      </Button>
    </form>
  );
}
