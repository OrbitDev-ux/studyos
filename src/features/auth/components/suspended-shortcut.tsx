"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { unbanSelf } from "@/features/auth/actions";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

/**
 * Recovery shortcut on the /suspended screen: ⌘+1 lifts the ban on the current
 * account and returns to the dashboard. Reuses the shared keyboard-shortcut
 * hook (listener bound once, cleaned up on unmount).
 */
export function SuspendedShortcut() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  useKeyboardShortcut({ key: "1", meta: true }, () => {
    if (status === "working") return;
    setStatus("working");
    void (async () => {
      try {
        const result = await unbanSelf();
        if (result?.error) {
          setStatus("error");
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } catch {
        setStatus("error");
      }
    })();
  });

  if (status === "working") {
    return <p className="text-muted-foreground text-xs">정지 해제 중...</p>;
  }
  if (status === "error") {
    return (
      <p className="text-destructive text-xs">해제에 실패했어요. 다시 시도해주세요.</p>
    );
  }
  return null;
}
