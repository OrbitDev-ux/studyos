"use client";

import { UserMinus } from "lucide-react";
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
import { removeFriend } from "@/features/social/actions";
import { useI18n } from "@/features/i18n/provider";

export function RemoveFriendButton({ friendshipId }: { friendshipId: string }) {
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
          aria-label={t.removeFriend}
        >
          <UserMinus className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.removeConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.removeConfirmDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => removeFriend(friendshipId))}
          >
            {messages.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
