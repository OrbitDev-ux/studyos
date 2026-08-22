"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cancelSubscription, resumeSubscription } from "@/features/billing/checkout-actions";

type ActionResult = { ok: boolean; error?: string };

export function SubscriptionCancelControls({ cancelAtPeriodEnd }: { cancelAtPeriodEnd: boolean }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, successTitle: string) {
    startTransition(async () => {
      const result = await action();
      toast({
        title: result.ok ? successTitle : (result.error ?? "문제가 발생했어요. 다시 시도해주세요."),
        variant: result.ok ? "success" : "error",
      });
    });
  }

  if (cancelAtPeriodEnd) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(resumeSubscription, "구독을 계속 이용해요.")}
      >
        취소 철회
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-muted-foreground"
      disabled={pending}
      onClick={() => run(cancelSubscription, "다음 결제일부터 구독이 종료돼요.")}
    >
      구독 취소
    </Button>
  );
}
