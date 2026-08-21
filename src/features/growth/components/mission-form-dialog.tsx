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
import { Textarea } from "@/components/ui/textarea";
import type { Subject } from "@/generated/prisma/client";
import { createMission, updateMission } from "@/features/growth/mission-actions";
import {
  createMissionFormSchema,
  type CreateMissionFormInput,
  type CreateMissionFormValues,
} from "@/features/growth/mission-schema";
import { MISSION_TYPES, type MissionType } from "@/features/growth/mission-types";
import { useI18n } from "@/features/i18n/provider";
import type { Messages } from "@/features/i18n/messages";
import { formatDateOnly } from "@/lib/date";

function missionTypeLabel(t: Messages["growth"], type: MissionType): string {
  switch (type) {
    case "STUDY_TIME":
      return t.missionTypeStudyTime;
    case "PROBLEM_COUNT":
      return t.missionTypeProblemCount;
    case "REVIEW_COUNT":
      return t.missionTypeReviewCount;
    case "GOAL":
      return t.missionTypeGoal;
    case "CUSTOM":
      return t.missionTypeCustom;
  }
}

type MissionFormDialogProps = {
  subjects: Subject[];
  trigger?: ReactNode;
  mission?: {
    id: string;
    title: string;
    description: string | null;
    type: MissionType;
    targetValue: number;
    subjectId: string | null;
    dueAt: Date | null;
  };
};

export function MissionFormDialog({ subjects, trigger, mission }: MissionFormDialogProps) {
  const { messages } = useI18n();
  const t = messages.growth;
  const isEdit = !!mission;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateMissionFormInput, unknown, CreateMissionFormValues>({
    resolver: zodResolver(createMissionFormSchema),
    defaultValues: {
      title: mission?.title ?? "",
      description: mission?.description ?? undefined,
      type: mission?.type ?? "CUSTOM",
      targetValue: mission?.targetValue ?? 1,
      subjectId: mission?.subjectId ?? undefined,
      dueAt: mission?.dueAt ? formatDateOnly(mission.dueAt) : undefined,
    },
  });

  async function onSubmit(values: CreateMissionFormValues) {
    setError(null);
    try {
      if (isEdit) {
        await updateMission(mission.id, values);
      } else {
        await createMission(values);
      }
      reset();
      setOpen(false);
    } catch {
      setError(t.missionSaveError);
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
            {t.missionAdd}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t.missionEditTitle : t.missionCreateTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mission-title">{t.missionFieldTitle}</Label>
            <Input
              id="mission-title"
              placeholder={t.missionTitlePlaceholder}
              {...register("title")}
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mission-description">{t.missionFieldDescription}</Label>
            <Textarea id="mission-description" rows={2} {...register("description")} />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t.missionFieldType}</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MISSION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {missionTypeLabel(t, type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {isEdit && <p className="text-muted-foreground text-xs">{t.missionTypeLocked}</p>}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="mission-target">{t.missionFieldTarget}</Label>
              <Input
                id="mission-target"
                type="number"
                min={1}
                {...register("targetValue")}
              />
              {errors.targetValue && (
                <p className="text-destructive text-xs">{errors.targetValue.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {subjects.length > 0 && (
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>{t.missionFieldSubject}</Label>
                <Controller
                  control={control}
                  name="subjectId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.missionFieldSubject} />
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
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="mission-due">{t.missionFieldDue}</Label>
              <Input id="mission-due" type="date" {...register("dueAt")} />
            </div>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? t.missionSubmitSave : t.missionSubmitAdd}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
