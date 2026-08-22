"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/features/social/actions";
import { setTyping } from "@/features/social/message-actions";
import { ShareProblemDialog } from "@/features/social/components/share-problem-dialog";
import { useI18n } from "@/features/i18n/provider";

const TYPING_THROTTLE_MS = 3000;

export type ReplyTarget = { id: string; content: string; senderName: string };

export function MessageInput({
  conversationId,
  replyTarget,
  onCancelReply,
  onSent,
}: {
  conversationId: string;
  replyTarget: ReplyTarget | null;
  onCancelReply: () => void;
  onSent: () => void;
}) {
  const router = useRouter();
  const { messages } = useI18n();
  const t = messages.social;
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "failed">("idle");
  const lastTypingCallRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingCallRef.current < TYPING_THROTTLE_MS) return;
    lastTypingCallRef.current = now;
    void setTyping(conversationId).catch(() => {});
  }

  async function send() {
    const trimmed = content.trim();
    if (!trimmed || status === "sending") return;

    setStatus("sending");
    try {
      await sendMessage(conversationId, trimmed, replyTarget?.id);
      setContent("");
      setStatus("idle");
      onSent();
      textareaRef.current?.focus();
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {replyTarget && (
        <div className="bg-muted/50 flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs">
          <span className="text-muted-foreground truncate">
            {t.replyingTo.replace("{name}", replyTarget.senderName)} · {replyTarget.content}
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label={t.cancelReply}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <ShareProblemDialog conversationId={conversationId} onShared={() => router.refresh()} />
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (e.target.value.trim()) notifyTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={t.messagePlaceholder}
          rows={1}
          className="max-h-40 min-h-9 flex-1 resize-none py-2"
          disabled={status === "sending"}
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void send()}
          disabled={status === "sending" || !content.trim()}
          aria-label={messages.common.send}
        >
          <Send className="size-4" />
        </Button>
      </div>
      {status === "sending" && (
        <p className="text-muted-foreground text-xs">{t.sendingLabel}</p>
      )}
      {status === "failed" && (
        <p className="text-destructive flex items-center gap-1.5 text-xs">
          <AlertCircle className="size-3.5" />
          {t.sendFailed}
          <button type="button" className="font-medium underline" onClick={() => void send()}>
            {t.retrySend}
          </button>
        </p>
      )}
    </div>
  );
}
