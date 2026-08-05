"use client";

import { Send } from "lucide-react";
import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/features/social/actions";

export function MessageInput({ conversationId }: { conversationId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const content = String(formData.get("content") ?? "");
    if (!content.trim()) return;

    startTransition(async () => {
      await sendMessage(conversationId, content);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex gap-2">
      <Input
        name="content"
        placeholder="메시지 입력"
        autoComplete="off"
        disabled={isPending}
      />
      <Button type="submit" size="icon" disabled={isPending} aria-label="전송">
        <Send className="size-4" />
      </Button>
    </form>
  );
}
