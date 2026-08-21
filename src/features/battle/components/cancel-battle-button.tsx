"use client";

import { useRouter } from "next/navigation";
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
import { cancelBattle } from "@/features/battle/actions";
import { useI18n } from "@/features/i18n/provider";

export function CancelBattleButton({ battleId }: { battleId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.battle;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={isPending}>
          {t.cancelBattle}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.cancelConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.cancelConfirmDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                await cancelBattle(battleId);
                router.push("/battle");
              })
            }
          >
            {t.cancelBattle}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
