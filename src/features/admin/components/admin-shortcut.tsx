"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

/**
 * Hidden admin entry point: pressing ⌘+Shift+A anywhere opens the admin login
 * modal. The shortcut only reveals the modal — it grants no access; the modal
 * runs the exact same credential/passphrase flow as the /admin-auth page, so
 * authorization is unchanged.
 *
 * Mounted once globally (root layout). The Dialog's built-in fade/zoom gives
 * the smooth reveal; typing in inputs/textareas is ignored by the hook.
 */
export function AdminShortcut() {
  const [open, setOpen] = useState(false);

  useKeyboardShortcut({ key: "a", meta: true, shift: true }, () => setOpen(true));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="bg-foreground text-background mx-auto flex size-11 items-center justify-center rounded-xl">
            <ShieldCheck className="size-6" />
          </div>
          <DialogTitle>관리자 인증</DialogTitle>
          <DialogDescription>StudyOS 운영자 전용입니다.</DialogDescription>
        </DialogHeader>
        <AdminLoginForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
