"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { toggleLabFeature } from "@/features/lab/admin-actions";

/** Admin ON/OFF switch for a lab feature. Authorization is enforced server-side. */
export function LabToggle({
  featureKey,
  enabled,
}: {
  featureKey: string;
  enabled: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={enabled}
      disabled={pending}
      aria-label="실험 기능 활성화"
      onCheckedChange={(next) =>
        startTransition(async () => {
          try {
            const res = await toggleLabFeature(featureKey, next);
            toast({
              title: res.error ?? (next ? "활성화했습니다." : "비활성화했습니다."),
            });
          } catch {
            toast({ title: "일시적인 오류가 발생했어요. 다시 시도해주세요." });
          }
        })
      }
    />
  );
}
