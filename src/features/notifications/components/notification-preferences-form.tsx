"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/features/i18n/provider";
import { useToast } from "@/components/ui/toast";
import { saveNotificationPreferences } from "@/features/notifications/actions";
import { isCategoryEnabled } from "@/features/notifications/service-core";
import { NOTIFICATION_CATEGORIES, type NotificationPreferences } from "@/features/notifications/types";

/** §6 — a Settings card, not a separate page: reuses the existing Settings
 * shell/Card layout rather than standing up a parallel preferences screen. */
export function NotificationPreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const { messages } = useI18n();
  const t = messages.notifications;
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial);
  const [isPending, startTransition] = useTransition();

  const ROWS: { category: (typeof NOTIFICATION_CATEGORIES)[number]; label: string; desc: string }[] = [
    { category: "dm", label: t.prefDm, desc: t.prefDmDesc },
    { category: "friend", label: t.prefFriend, desc: t.prefFriendDesc },
    { category: "study", label: t.prefStudy, desc: t.prefStudyDesc },
    { category: "system", label: t.prefSystem, desc: t.prefSystemDesc },
  ];

  function toggle(category: (typeof NOTIFICATION_CATEGORIES)[number], checked: boolean) {
    const next = { ...prefs, [category]: checked };
    setPrefs(next);
    startTransition(() => {
      saveNotificationPreferences(next)
        .then((res) => {
          if (res.error) {
            toast({ title: t.preferencesSaveFailed, variant: "error" });
            setPrefs(prefs); // revert optimistic toggle
          }
        })
        .catch(() => {
          toast({ title: t.preferencesSaveFailed, variant: "error" });
          setPrefs(prefs);
        });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{t.preferencesTitle}</h2>
        <p className="text-muted-foreground text-sm">{t.preferencesSubtitle}</p>
      </div>
      <div className="flex flex-col gap-3">
        {ROWS.map((row) => (
          <div key={row.category} className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-muted-foreground text-xs">{row.desc}</span>
            </div>
            <Switch
              checked={isCategoryEnabled(prefs, row.category)}
              disabled={isPending}
              onCheckedChange={(checked) => toggle(row.category, checked)}
              aria-label={row.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
