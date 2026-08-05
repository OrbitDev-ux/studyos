"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startConversation } from "@/features/social/actions";

export function MessageFriendButton({ friendUserId }: { friendUserId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      disabled={isPending}
      aria-label="메시지 보내기"
      onClick={() =>
        startTransition(async () => {
          const conversationId = await startConversation(friendUserId);
          router.push(`/social/${conversationId}`);
        })
      }
    >
      <MessageCircle className="size-4" />
    </Button>
  );
}
