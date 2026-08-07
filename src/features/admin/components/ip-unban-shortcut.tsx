"use client";

import { useState } from "react";
import { clearMyIpBlock } from "@/features/admin/security-actions";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

/**
 * Global recovery shortcut: ⌘+Option+3 lifts the IP block on the current IP so
 * an operator locked out of admin sign-in can get back in. Matches the physical
 * key (Digit3) since Option rewrites event.key on macOS. Mounted once in the
 * root layout; shows a brief confirmation toast of its own (no ToastProvider
 * exists on public pages).
 */
export function IpUnbanShortcut() {
  const [note, setNote] = useState<string | null>(null);

  useKeyboardShortcut({ code: "Digit3", meta: true, alt: true }, () => {
    void (async () => {
      try {
        const { removed } = await clearMyIpBlock();
        setNote(
          removed > 0
            ? `IP 차단이 해제되었습니다 (${removed}건).`
            : "해제할 IP 차단이 없습니다.",
        );
      } catch {
        setNote("IP 차단 해제에 실패했습니다.");
      }
      setTimeout(() => setNote(null), 3000);
    })();
  });

  if (!note) return null;

  return (
    <div
      role="status"
      className="bg-card ring-foreground/10 animate-in fade-in-0 slide-in-from-bottom-2 fixed bottom-4 left-1/2 z-100 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg ring-1"
    >
      {note}
    </div>
  );
}
