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
import { BATTLE_DURATION_LABEL, BATTLE_METRIC_LABEL } from "@/features/battle/constants";
import {
  createBattleFormSchema,
  type CreateBattleFormInput,
  type CreateBattleFormValues,
} from "@/features/battle/schema";
import type { getFriends } from "@/features/social/queries";

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

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBattleFormInput, unknown, CreateBattleFormValues>({
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
      setError(err instanceof Error ? err.message : "배틀 생성에 실패했습니다.");
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
          <DialogTitle>공부 배틀 시작</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>기준</Label>
              <Controller
                control={control}
                name="metric"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BATTLE_METRIC_LABEL).map(([value, label]) => (
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
              <Label>기간</Label>
              <Controller
                control={control}
                name="durationDays"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BATTLE_DURATION_LABEL).map(([value, label]) => (
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
            <Label>초대할 친구</Label>
            {friends.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                초대할 친구가 없어요. 먼저 친구를 추가해주세요.
              </p>
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
              {isSubmitting ? "생성 중..." : "배틀 시작"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
