"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type ActionResult = { error?: string } | void;

/** Reusable "are you sure?" gate. `onConfirm` runs a Server Action from the
 * client; on success we toast + refresh, on `{ error }` we toast the message
 * and keep the dialog open so the operator can retry. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "확인",
  variant = "default",
  successMessage,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  successMessage: string;
  onConfirm: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      const result = await onConfirm();
      if (result && "error" in result && result.error) {
        toast({ title: "실패", description: result.error, variant: "error" });
        return;
      }
      toast({ title: successMessage, variant: "success" });
      setOpen(false);
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
          <Button
            type="button"
            variant={variant}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "처리 중..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
