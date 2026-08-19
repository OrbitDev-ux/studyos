"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { deleteMyAccount } from "@/features/account/actions";
import { useI18n } from "@/features/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function AccountDeletionCard() {
  const { messages } = useI18n();
  const t = messages.accountDeletion;
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMyAccount(confirmation);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t.summary}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-fit">{t.open}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive size-4" /> {t.confirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t.confirmDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-deletion-confirmation">{t.confirmLabel}</Label>
              <Input
                id="account-deletion-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                disabled={isPending}
              />
              {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isPending || confirmation !== "DELETE"}
                onClick={(event) => { event.preventDefault(); submit(); }}
              >
                {isPending ? t.pending : t.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
