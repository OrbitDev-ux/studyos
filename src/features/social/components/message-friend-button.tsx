"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startConversation } from "@/features/social/actions";

export function MessageFriendButton({ friendUserId }: { friendUserId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        aria-label="채팅 시작"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const conversationId = await startConversation(friendUserId);
              router.push(`/social/${conversationId}`);
            } catch {
              setError("대화를 시작하지 못했습니다.");
            }
          });
        }}
      >
        <MessageCircle className="size-4" />
        채팅
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
