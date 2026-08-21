"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/features/i18n/provider";
import { updateActivitySharing } from "@/features/social/actions";

/** Settings toggle for the "친구에게 활동 공개" opt-out (features/social/activity).
 * Same optimistic-toggle-with-revert shape as NotificationPreferencesForm. */
export function ActivitySharingToggle({ initial }: { initial: boolean }) {
  const { messages } = useI18n();
  const t = messages.social;
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(checked: boolean) {
    setEnabled(checked);
    startTransition(() => {
      updateActivitySharing(checked).catch(() => {
        toast({ title: t.activitySharingSaveFailed, variant: "error" });
        setEnabled(!checked);
      });
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{t.activitySharingTitle}</span>
        <span className="text-muted-foreground text-xs">{t.activitySharingDesc}</span>
      </div>
      <Switch
        checked={enabled}
        disabled={isPending}
        onCheckedChange={toggle}
        aria-label={t.activitySharingTitle}
      />
    </div>
  );
}
