"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/features/i18n/provider";

/**
 * Shows a fixed banner while the browser is offline, telling the user that AI
 * features need a connection. Reflects real connectivity (navigator.onLine +
 * online/offline events) — it never fakes offline AI handling.
 */
export function OfflineBanner() {
  const { messages } = useI18n();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="bg-warning text-warning-foreground fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium shadow-sm"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>{messages.common.offline}</span>
    </div>
  );
}
