"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondToBattleInvite } from "@/features/battle/actions";

export function RespondBattleInviteButtons({ battleId }: { battleId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 rounded-md border p-3">
      <p className="text-sm">배틀에 초대받았어요.</p>
      <div className="ml-auto flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => respondToBattleInvite(battleId, true))}
        >
          참가
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => respondToBattleInvite(battleId, false))}
        >
          거절
        </Button>
      </div>
    </div>
  );
}
