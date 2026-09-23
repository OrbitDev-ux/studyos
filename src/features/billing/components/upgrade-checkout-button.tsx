"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { startCheckout } from "@/features/billing/checkout-actions";

/**
 * Starts a checkout for PRO/PREMIUM. Provider-aware (see providers.ts):
 *  - Polar (primary): the server action creates a hosted Checkout Session and
 *    we hard-redirect the browser to it. The card charge + entitlement happen
 *    at Polar and arrive via the signed order.paid / subscription.* webhooks.
 *  - Toss (legacy): the server action hands back the public client key + this
 *    user's own id/email/name — the secret key and the actual charge happen
 *    server-side in /billing/callback after Toss redirects back with an
 *    authKey.
 *
 * Degrades gracefully (a toast, not a crash) when neither provider is
 * configured — see providers.ts's fail-closed design.
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
        const result = await startCheckout(plan);
        if (!result.ok) {
          toast({ title: result.error, variant: "error" });
          return;
        }

        if (result.kind === "polar") {
          window.location.assign(result.checkoutUrl);
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
