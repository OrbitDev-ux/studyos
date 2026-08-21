"use client";

import { useEffect, useRef } from "react";
import {
  MessageBubble,
  type ConversationMessage,
} from "@/features/social/components/message-bubble";
import { useI18n } from "@/features/i18n/provider";

const TYPING_TTL_MS = 6000;

export type ChatParticipant = {
  userId: string;
  lastReadAt: string | null;
  typingAt: string | null;
  user: { id: string; name: string | null; image: string | null; lastSeenAt: string | null };
};

export type ChatConversation = {
  id: string;
  participants: ChatParticipant[];
  messages: ConversationMessage[];
};

export function MessagePanel({
  conversation,
  currentUserId,
  highlightedId,
  onReply,
  onQuoteClick,
}: {
  conversation: ChatConversation;
  currentUserId: string;
  highlightedId: string | null;
  onReply: (message: ConversationMessage) => void;
  onQuoteClick: (messageId: string) => void;
}) {
  const { messages } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);

  const other = conversation.participants.find((p) => p.userId !== currentUserId);

  // The read receipt only ever renders on the LAST message *I* sent (typical
  // chat UX, not "every message"), and only once the other participant's own
  // lastReadAt has actually passed it — no per-message read-receipt rows, no
  // extra writes.
  const lastMineId = [...conversation.messages]
    .reverse()
    .find((m) => m.senderId === currentUserId && !m.deletedAt)?.id;
  const otherHasRead =
    !!other?.lastReadAt && !!lastMineId
      ? new Date(conversation.messages.find((m) => m.id === lastMineId)!.createdAt) <=
        new Date(other.lastReadAt)
      : false;

  const otherIsTyping =
    !!other?.typingAt && Date.now() - new Date(other.typingAt).getTime() < TYPING_TTL_MS;

  useEffect(() => {
    if (!highlightedId) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.messages.length, highlightedId]);

  if (conversation.messages.length === 0) {
    return <p className="text-muted-foreground text-sm">{messages.social.panelEmpty}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {conversation.messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isMine={message.senderId === currentUserId}
          currentUserId={currentUserId}
          showReadReceipt={message.id === lastMineId && otherHasRead}
          isHighlighted={message.id === highlightedId}
          onReply={onReply}
          onQuoteClick={onQuoteClick}
        />
      ))}
      {otherIsTyping && other && (
        <p className="text-muted-foreground px-1 text-xs italic">
          {messages.social.typingIndicator.replace("{name}", other.user.name ?? "")}
        </p>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
