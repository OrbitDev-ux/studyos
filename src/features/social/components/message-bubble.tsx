"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  Copy,
  MoreHorizontal,
  Pencil,
  Reply,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { deleteMessage, editMessage, reactToMessage } from "@/features/social/message-actions";
import { QUICK_REACTIONS } from "@/features/social/reactions";
import type { SharedProblemPreview } from "@/features/social/queries";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import { useI18n } from "@/features/i18n/provider";
import { formatTimeOnly } from "@/lib/date";
import { cn } from "@/lib/utils";

/**
 * Client-facing shape — dates as ISO strings, not Prisma Date instances
 * (same explicit-serialization convention features/tutor's conversation
 * list already uses when a Server Component hands data to a client one).
 * The page maps getConversation()'s result into this shape once, at the
 * server/client boundary.
 */
export type ConversationMessage = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  replyTo: {
    id: string;
    content: string;
    deletedAt: string | null;
    sender: { id: string; name: string | null; image: string | null };
  } | null;
  reactions: { id: string; emoji: string; userId: string }[];
  sharedProblem: SharedProblemPreview | null;
};

export function MessageBubble({
  message,
  isMine,
  currentUserId,
  showReadReceipt,
  isHighlighted,
  onReply,
  onQuoteClick,
}: {
  message: ConversationMessage;
  isMine: boolean;
  currentUserId: string;
  showReadReceipt: boolean;
  isHighlighted: boolean;
  onReply: (message: ConversationMessage) => void;
  onQuoteClick: (messageId: string) => void;
}) {
  const { messages, locale } = useI18n();
  const t = messages.social;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const isDeleted = !!message.deletedAt;

  const grouped = useMemo(() => {
    const byEmoji = new Map<string, { emoji: string; count: number; mine: boolean }>();
    for (const r of message.reactions) {
      const cur = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
      cur.count += 1;
      if (r.userId === currentUserId) cur.mine = true;
      byEmoji.set(r.emoji, cur);
    }
    return [...byEmoji.values()];
  }, [message.reactions, currentUserId]);

  function handleCopy() {
    void navigator.clipboard.writeText(message.content).then(() => {
      toast({ title: t.copied, variant: "success" });
    });
  }

  function handleSaveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await editMessage(message.id, trimmed);
      if (result.error) {
        toast({ title: t.editFailed, variant: "error" });
      } else {
        setIsEditing(false);
      }
    });
  }

  function handleReact(emoji: string) {
    startTransition(() => {
      void reactToMessage(message.id, emoji);
    });
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "group flex scroll-mt-16 flex-col gap-1 rounded-lg px-1 py-0.5 transition-colors",
        isMine ? "items-end" : "items-start",
        isHighlighted && "bg-primary/10",
      )}
    >
      {message.replyTo && (
        <button
          type="button"
          onClick={() => onQuoteClick(message.replyTo!.id)}
          className={cn(
            "text-muted-foreground border-muted-foreground/30 max-w-[75%] truncate border-l-2 pl-2 text-left text-xs hover:opacity-80",
            isMine && "self-end",
          )}
        >
          <span className="font-medium">{message.replyTo.sender.name ?? "?"}</span>{" "}
          {message.replyTo.deletedAt ? t.deletedTag : message.replyTo.content}
        </button>
      )}

      <div className={cn("flex items-end gap-1.5", isMine && "flex-row-reverse")}>
        {isDeleted ? (
          <p className="bg-muted/60 text-muted-foreground max-w-[75%] rounded-lg px-3 py-2 text-sm italic">
            {t.deletedTag}
          </p>
        ) : isEditing ? (
          <div className="flex w-full max-w-[75%] flex-col gap-1.5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  setIsEditing(false);
                  setDraft(message.content);
                }
              }}
              rows={2}
              autoFocus
              disabled={isPending}
              className="text-sm"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setDraft(message.content);
                }}
              >
                {messages.common.cancel}
              </Button>
              <Button type="button" size="sm" disabled={isPending} onClick={handleSaveEdit}>
                <Check className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn("flex max-w-[75%] flex-col gap-1.5", isMine && "items-end")}>
            {message.sharedProblem && <SharedProblemCard problem={message.sharedProblem} />}
            {message.content && (
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap",
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {message.content}
                {message.editedAt && (
                  <span
                    className={cn(
                      "ml-1.5 text-[10px] opacity-70",
                      isMine ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t.editedTag}
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {!isDeleted && !isEditing && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="icon-sm" variant="ghost" aria-label={t.react}>
                  <SmilePlus className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMine ? "end" : "start"}>
                <div className="flex gap-1 px-1 py-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="hover:bg-muted rounded-md p-1.5 text-base leading-none"
                      onClick={() => handleReact(emoji)}
                      aria-label={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t.reply}
              onClick={() => onReply(message)}
            >
              <Reply className="size-3.5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="icon-sm" variant="ghost" aria-label={t.copy}>
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMine ? "end" : "start"}>
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="size-3.5" /> {t.copy}
                </DropdownMenuItem>
                {isMine && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="size-3.5" /> {t.edit}
                  </DropdownMenuItem>
                )}
                {isMine && <DeleteMessageMenuItem messageId={message.id} />}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {grouped.length > 0 && (
        <div className={cn("flex flex-wrap gap-1", isMine && "justify-end")}>
          {grouped.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => handleReact(r.emoji)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs",
                r.mine ? "border-primary bg-primary/10" : "border-border bg-muted/40",
              )}
            >
              <span>{r.emoji}</span>
              <span className="tabular-nums">{r.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="text-muted-foreground flex items-center gap-1.5 px-1 text-[10px]">
        <span>{formatTimeOnly(new Date(message.createdAt), locale)}</span>
        {showReadReceipt && <span>{t.readLabel}</span>}
      </div>
    </div>
  );
}

function DeleteMessageMenuItem({ messageId }: { messageId: string }) {
  const { messages } = useI18n();
  const t = messages.social;
  const [isPending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => e.preventDefault()}
          disabled={isPending}
        >
          <Trash2 className="size-3.5" /> {messages.common.delete}
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteMessageConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.deleteMessageConfirmDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => deleteMessage(messageId))}
          >
            {messages.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SharedProblemCard({ problem }: { problem: SharedProblemPreview }) {
  const { messages } = useI18n();
  const t = messages.social;

  return (
    <div className="bg-card w-64 rounded-lg border p-3">
      <div className="flex items-center gap-1.5">
        <BookOpen className="text-muted-foreground size-3.5 shrink-0" />
        {problem.subject && <SubjectChip name={problem.subject.name} color={problem.subject.color} />}
      </div>
      <p className="mt-1.5 line-clamp-3 text-sm">{problem.prompt}</p>
      {problem.canSolve && (
        <Button asChild size="sm" variant="outline" className="mt-2 w-full">
          <Link href="/problems">{t.solveSharedProblem}</Link>
        </Button>
      )}
    </div>
  );
}
