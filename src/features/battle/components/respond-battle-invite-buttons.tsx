"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondToBattleInvite } from "@/features/battle/actions";
import { useI18n } from "@/features/i18n/provider";

export function RespondBattleInviteButtons({ battleId }: { battleId: string }) {
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.battle;

  return (
    <div className="flex items-center gap-2 rounded-md border p-3">
      <p className="text-sm">{t.inviteReceived}</p>
      <div className="ml-auto flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => respondToBattleInvite(battleId, true))}
        >
          {t.accept}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => respondToBattleInvite(battleId, false))}
        >
          {t.decline}
        </Button>
      </div>
    </div>
  );
}
