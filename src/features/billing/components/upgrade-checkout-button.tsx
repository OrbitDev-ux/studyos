"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getBillingAuthConfig } from "@/features/billing/checkout-actions";

/**
 * Starts a Toss "billing key" card-registration flow for PRO/PREMIUM. The
 * server action only ever hands back the public client key + this user's own
 * id/email/name — the secret key and the actual charge happen server-side in
 * /billing/callback after Toss redirects back with an authKey.
 *
 * Degrades gracefully (a toast, not a crash) when TOSS_SECRET_KEY /
 * NEXT_PUBLIC_TOSS_CLIENT_KEY aren't configured yet — see checkout-actions.ts.
 */
export function UpgradeCheckoutButton({
  plan,
  className,
  children = "업그레이드",
}: {
  plan: "PRO" | "PREMIUM";
  className?: string;
  children?: React.ReactNode;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await getBillingAuthConfig(plan);
        if (!result.ok) {
          toast({ title: result.error, variant: "error" });
          return;
        }

        const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
        const tossPayments = await loadTossPayments(result.config.clientKey);
        const payment = tossPayments.payment({ customerKey: result.config.customerKey });
        const origin = window.location.origin;

        await payment.requestBillingAuth({
          method: "CARD",
          successUrl: `${origin}/billing/callback?plan=${plan}`,
          failUrl: `${origin}/billing/callback?plan=${plan}&status=fail`,
          customerEmail: result.config.customerEmail,
          customerName: result.config.customerName,
        });
      } catch (error) {
        // The user just closing the widget throws too — not worth an error toast.
        const name = (error as { name?: string } | null)?.name;
        if (name === "UserCancelError" || name === "PaymentRequestAbortedError") return;
        toast({ title: "결제창을 여는 중 문제가 발생했어요. 다시 시도해주세요.", variant: "error" });
      }
    });
  }

  return (
    <Button className={className} onClick={handleClick} disabled={pending}>
      {pending ? "연결하는 중..." : children}
    </Button>
  );
}
