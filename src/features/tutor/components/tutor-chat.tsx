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
import { resolveStreamErrorOutcome } from "@/features/tutor/chat-outcome";
import { tutorGradeLabel, tutorSubjectLabel } from "@/features/tutor/config";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: string; content: string; streaming?: boolean };
type ConvoSummary = { id: string; title: string; subject: string; updatedAt: string };

type StreamEvent =
  | { type: "chunk"; text: string }
  | {
      type: "done";
      reviewScheduled?: { concept: string; count: number };
      understanding?: string;
    }
  | { type: "error"; error: string; code?: string; upgradePlan?: string | null };

const GENERIC_ERROR = "일시적인 오류가 발생했어요. 다시 시도해주세요.";

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
  // The last message that produced no reply at all — offered a "resend" action.
  // null once nothing needs resending (success, or some reply arrived anyway).
  const [retryable, setRetryable] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  /**
   * Consumes the NDJSON stream from POST /api/tutor/[id]/messages (P0-3) —
   * appends each chunk to the assistant bubble live instead of waiting for
   * the full reply, replacing the old client-side typewriter replay that
   * only faked the appearance of streaming after the fact.
   */
  async function streamReply(content: string) {
    const assistantId = `ai-${Date.now()}`;
    let started = false;
    let hadVisibleText = false;

    try {
      const res = await fetch(`/api/tutor/${conversation.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? GENERIC_ERROR);
        setRetryable(content);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;

          if (event.type === "chunk") {
            hadVisibleText = true;
            if (!started) {
              started = true;
              setMessages((prev) => [
                ...prev,
                {
                  id: assistantId,
                  role: "assistant",
                  content: event.text,
                  streaming: true,
                },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.text } : m,
                ),
              );
            }
          } else if (event.type === "done") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
            );
            if (event.reviewScheduled) {
              const { concept, count } = event.reviewScheduled;
              setMessages((prev) => [
                ...prev,
                {
                  id: `note-${Date.now()}`,
                  role: "note",
                  content: `'${concept}' 복습 ${count}개를 오늘 복습에 추가했어요.`,
                },
              ]);
            }
          } else {
            const outcome = resolveStreamErrorOutcome(event, hadVisibleText, content);
            setError(outcome.error);
            setRetryable(outcome.retryableContent);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
            );
          }
        }
      }
    } catch {
      // Network loss / an unexpected client-side failure mid-stream. Keep
      // whatever text already reached the screen; only offer a resend if
      // nothing did.
      if (!hadVisibleText) {
        setError(GENERIC_ERROR);
        setRetryable(content);
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
      );
    }
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    setError(null);
    setRetryable(null);
    const userMsg: Msg = { id: `local-${Date.now()}`, role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    startTransition(() => streamReply(content));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter = newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const isAwaitingFirstChunk = pending && !messages.some((m) => m.streaming);

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
              {tutorSubjectLabel(conversation.subject)} ·{" "}
              {tutorGradeLabel(conversation.grade)}
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
                <TutorConversationList
                  conversations={conversations}
                  activeId={conversation.id}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
        {messages.map((m) => {
          if (m.role === "note") {
            return (
              <div key={m.id} className="flex justify-center">
                <p className="border-primary/20 bg-primary/5 text-primary rounded-full border px-3 py-1 text-xs">
                  🔁 {m.content}
                </p>
              </div>
            );
          }
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={cn("flex", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {!isUser && (
                  <p className="text-muted-foreground mb-0.5 text-xs font-medium">
                    선생님
                  </p>
                )}
                {m.streaming ? (
                  // Plain text while streaming — partial LaTeX (e.g. an
                  // unclosed \frac{) would render broken/flickering through
                  // KaTeX mid-stream. Switches to MathText once the reply is
                  // complete (m.streaming cleared on the "done"/"error" event).
                  <span className="whitespace-pre-wrap">
                    {m.content}
                    <span className="animate-pulse">▍</span>
                  </span>
                ) : (
                  <MathText className={isUser ? "text-primary-foreground" : ""}>
                    {m.content}
                  </MathText>
                )}
              </div>
            </div>
          );
        })}
        {isAwaitingFirstChunk && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl px-3.5 py-2.5 text-sm">
              선생님이 입력 중<span className="animate-pulse">…</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-1 pb-1" role="alert">
          <p className="text-destructive text-xs">{error}</p>
          {retryable && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => send(retryable)}
            >
              다시 보내기
            </Button>
          )}
        </div>
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
