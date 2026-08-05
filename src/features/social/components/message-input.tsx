"use client";

import { Send } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/features/social/actions";

export function MessageInput({ conversationId }: { conversationId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const content = String(formData.get("content") ?? "");
    if (!content.trim()) return;

    setError(null);
    startTransition(async () => {
      try {
        await sendMessage(conversationId, content);
        formRef.current?.reset();
      } catch {
        setError("전송에 실패했습니다. 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
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
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
