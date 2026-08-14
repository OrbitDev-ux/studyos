"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startConversation } from "@/features/social/actions";
import { useI18n } from "@/features/i18n/provider";

export function MessageFriendButton({ friendUserId }: { friendUserId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.social;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        aria-label={t.startChat}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const conversationId = await startConversation(friendUserId);
              router.push(`/social/${conversationId}`);
            } catch {
              setError(t.startChatFailed);
            }
          });
        }}
      >
        <MessageCircle className="size-4" />
        {t.chat}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
