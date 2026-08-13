"use client";

import Link from "next/link";
import { ArrowLeft, Menu, Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/math-text";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { NewTutorDialog } from "@/features/tutor/components/new-tutor-dialog";
import { TutorConversationList } from "@/features/tutor/components/tutor-conversation-list";
import { sendTutorMessage } from "@/features/tutor/actions";
import { tutorGradeLabel, tutorSubjectLabel } from "@/features/tutor/config";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: string; content: string };
type ConvoSummary = { id: string; title: string; subject: string; updatedAt: string };

const QUICK_ACTIONS: { label: string; message: string }[] = [
  { label: "개념 설명", message: "이 개념을 쉽게 설명해줘." },
  { label: "문제 같이 풀기", message: "문제를 같이 풀어보고 싶어요." },
  { label: "힌트", message: "힌트를 한 단계만 주세요." },
  { label: "오답 복습", message: "내가 자주 틀리는 부분을 복습하고 싶어요." },
  { label: "다시 설명", message: "방금 설명을 더 쉽게 다시 설명해줘." },
];

export function TutorChat({
  conversation,
  initialMessages,
  conversations,
}: {
  conversation: { id: string; subject: string; grade: string; title: string };
  initialMessages: Msg[];
  conversations: ConvoSummary[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Client-side reveal of the received reply (the provider can't token-stream).
  const [revealId, setRevealId] = useState<string | null>(null);
  const [revealLen, setRevealLen] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, revealLen, pending]);

  // Typewriter reveal.
  useEffect(() => {
    if (!revealId) return;
    const msg = messages.find((m) => m.id === revealId);
    if (!msg) return;
    if (revealLen >= msg.content.length) {
      setRevealId(null);
      return;
    }
    const t = setTimeout(() => setRevealLen((n) => Math.min(n + 3, msg.content.length)), 12);
    return () => clearTimeout(t);
  }, [revealId, revealLen, messages]);

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    setError(null);
    const userMsg: Msg = { id: `local-${Date.now()}`, role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    startTransition(async () => {
      const res = await sendTutorMessage({ conversationId: conversation.id, content });
      if (res.error) {
        setError(res.error);
        return; // user message stays (preserved)
      }
      if (res.reply) {
        const id = `ai-${Date.now()}`;
        setMessages((prev) => [...prev, { id, role: "assistant", content: res.reply!.content }]);
        setRevealId(id);
        setRevealLen(0);
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter = newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-6rem)] w-full max-w-3xl flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon-sm" aria-label="목록으로">
            <Link href="/tutor">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              🧑‍🏫 StudyOS AI 선생님
            </p>
            <p className="text-muted-foreground text-xs">
              {tutorSubjectLabel(conversation.subject)} · {tutorGradeLabel(conversation.grade)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <NewTutorDialog variant="outline" />
          {/* Conversation drawer (mobile-friendly) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="대화 목록">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 max-w-[85vw]">
              <SheetHeader>
                <SheetTitle>대화 목록</SheetTitle>
              </SheetHeader>
              <div className="mt-3 px-1">
                <TutorConversationList conversations={conversations} activeId={conversation.id} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const text =
            m.id === revealId ? m.content.slice(0, revealLen) : m.content;
          return (
            <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {!isUser && (
                  <p className="text-muted-foreground mb-0.5 text-xs font-medium">선생님</p>
                )}
                <MathText className={isUser ? "text-primary-foreground" : ""}>{text}</MathText>
              </div>
            </div>
          );
        })}
        {pending && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl px-3.5 py-2.5 text-sm">
              선생님이 입력 중<span className="animate-pulse">…</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-destructive px-1 pb-1 text-xs" role="alert">
          {error} 잠시 후 다시 시도해주세요.
        </p>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 pb-2">
        {QUICK_ACTIONS.map((qa) => (
          <Button
            key={qa.label}
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => send(qa.message)}
          >
            {qa.label}
          </Button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 border-t pt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={4000}
          placeholder="메시지를 입력하세요… (Enter 전송, Shift+Enter 줄바꿈)"
          className="max-h-40 min-h-11 flex-1 resize-none"
          disabled={pending}
        />
        <Button
          type="button"
          size="icon"
          className="size-11 shrink-0"
          disabled={pending || input.trim().length === 0}
          onClick={() => send(input)}
          aria-label="전송"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
