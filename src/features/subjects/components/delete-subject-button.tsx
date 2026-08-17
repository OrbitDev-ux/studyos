"use client";

import { Trash2 } from "lucide-react";
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
import { useI18n } from "@/features/i18n/provider";
import { deleteSubject } from "@/features/subjects/actions";

export function DeleteSubjectButton({ subjectId }: { subjectId: string }) {
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.subjects;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={isPending}
          aria-label={t.deleteLabel}
        >
          <Trash2 className="text-destructive size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.deleteConfirmDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => deleteSubject(subjectId))}
          >
            {messages.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
