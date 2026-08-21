"use client";

import { Ban } from "lucide-react";
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
import { blockUser } from "@/features/social/actions";
import { useI18n } from "@/features/i18n/provider";

export function BlockUserButton({ targetUserId }: { targetUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.social;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={isPending}
          aria-label={t.blockUser}
        >
          <Ban className="text-destructive size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.blockConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.blockConfirmDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={() => startTransition(() => blockUser(targetUserId))}>
            {t.blockUser}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
