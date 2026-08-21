"use client";

import { useState } from "react";
import {
  MessagePanel,
  type ChatConversation,
} from "@/features/social/components/message-panel";
import { MessageInput, type ReplyTarget } from "@/features/social/components/message-input";
import { MessageSearch } from "@/features/social/components/message-search";
import type { ConversationMessage } from "@/features/social/components/message-bubble";

/**
 * Owns the two pieces of state the message list and the composer need to
 * share — which message (if any) is being replied to, and which message a
 * reply-quote/search-result click should scroll to and briefly highlight —
 * so MessagePanel/MessageInput/MessageSearch stay presentational.
 */
export function ChatRoom({
  conversation,
  currentUserId,
}: {
  conversation: ChatConversation;
  currentUserId: string;
}) {
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`message-${messageId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(messageId);
    window.setTimeout(() => setHighlightedId(null), 1500);
  }

  function handleReply(message: ConversationMessage) {
    const senderIsMe = message.senderId === currentUserId;
    const senderName = senderIsMe
      ? ""
      : (conversation.participants.find((p) => p.userId === message.senderId)?.user.name ?? "");
    setReplyTarget({ id: message.id, content: message.content, senderName });
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex justify-end">
        <MessageSearch conversationId={conversation.id} onResultClick={scrollToMessage} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <MessagePanel
          conversation={conversation}
          currentUserId={currentUserId}
          highlightedId={highlightedId}
          onReply={handleReply}
          onQuoteClick={scrollToMessage}
        />
      </div>
      <MessageInput
        conversationId={conversation.id}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        onSent={() => setReplyTarget(null)}
      />
    </div>
  );
}
