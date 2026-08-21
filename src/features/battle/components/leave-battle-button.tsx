"use client";

import { useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { leaveBattle } from "@/features/battle/actions";
import { useI18n } from "@/features/i18n/provider";

export function LeaveBattleButton({ battleId }: { battleId: string }) {
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.battle;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={isPending}>
          {t.leaveBattle}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.leaveConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.leaveConfirmDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={() => startTransition(() => leaveBattle(battleId))}>
            {t.leaveBattle}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
