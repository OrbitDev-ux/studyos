"use client";

import { Send } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/features/social/actions";
import { useI18n } from "@/features/i18n/provider";

export function MessageInput({ conversationId }: { conversationId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.social;

  function handleSubmit(formData: FormData) {
    const content = String(formData.get("content") ?? "");
    if (!content.trim()) return;

    setError(null);
    startTransition(async () => {
      try {
        await sendMessage(conversationId, content);
        formRef.current?.reset();
      } catch {
        setError(t.sendFailed);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <form ref={formRef} action={handleSubmit} className="flex gap-2">
        <Input
          name="content"
          placeholder={t.messagePlaceholder}
          autoComplete="off"
          disabled={isPending}
        />
        <Button type="submit" size="icon" disabled={isPending} aria-label={messages.common.send}>
          <Send className="size-4" />
        </Button>
      </form>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
