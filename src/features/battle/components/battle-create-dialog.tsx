"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBattle } from "@/features/battle/actions";
import {
  BATTLE_DURATION_DAYS,
  BATTLE_METRICS,
  battleDurationLabel,
  battleMetricLabel,
} from "@/features/battle/constants";
import {
  createBattleFormSchema,
  type CreateBattleFormValues,
} from "@/features/battle/schema";
import type { getFriends } from "@/features/social/queries";
import { useI18n } from "@/features/i18n/provider";

export function BattleCreateDialog({
  friends,
  trigger,
}: {
  friends: Awaited<ReturnType<typeof getFriends>>;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { messages } = useI18n();
  const t = messages.battle;

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBattleFormValues>({
    resolver: zodResolver(createBattleFormSchema),
    defaultValues: { metric: "study_time", durationDays: "3", friendUserIds: [] },
  });

  async function onSubmit(values: CreateBattleFormValues) {
    setError(null);
    try {
      const battleId = await createBattle(values);
      reset();
      setOpen(false);
      router.push(`/battle/${battleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createError);
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
          <DialogTitle>{t.createTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t.metricLabel}</Label>
              <Controller
                control={control}
                name="metric"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BATTLE_METRICS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {battleMetricLabel(t, value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t.durationLabel}</Label>
              <Controller
                control={control}
                name="durationDays"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BATTLE_DURATION_DAYS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {battleDurationLabel(t, value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t.inviteFriendsLabel}</Label>
            {friends.length === 0 ? (
              <p className="text-muted-foreground text-xs">{t.noFriends}</p>
            ) : (
              <Controller
                control={control}
                name="friendUserIds"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    {friends.map(({ user }) => {
                      const checked = field.value.includes(user.id);
                      return (
                        <label key={user.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              field.onChange(
                                next
                                  ? [...field.value, user.id]
                                  : field.value.filter((id) => id !== user.id),
                              );
                            }}
                          />
                          {user.name ?? user.email}
                        </label>
                      );
                    })}
                  </div>
                )}
              />
            )}
            {errors.friendUserIds && (
              <p className="text-destructive text-xs">{errors.friendUserIds.message}</p>
            )}
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || friends.length === 0}>
              {isSubmitting ? t.creating : t.start}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
