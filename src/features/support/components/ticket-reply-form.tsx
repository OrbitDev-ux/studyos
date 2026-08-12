"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addUserMessage } from "@/features/support/actions";

/** User reply box on their own ticket. Disabled when the ticket is closed. */
export function TicketReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (closed) {
    return (
      <p className="text-muted-foreground text-sm">
        종료된 문의예요. 추가 문의가 있다면 새 문의를 작성해주세요.
      </p>
    );
  }

  function submit() {
    setError(null);
    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const res = await addUserMessage({ ticketId, content });
      if (res.error) {
        setError(res.error);
        return;
      }
      setContent("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        rows={3}
        value={content}
        maxLength={5000}
        placeholder="답변을 입력하세요"
        onChange={(e) => setContent(e.target.value)}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="button" onClick={submit} disabled={pending} className="self-end">
        {pending ? "전송 중..." : "전송"}
      </Button>
    </div>
  );
}
