"use client";

import { BookOpen, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import { getShareableProblems, shareProblem } from "@/features/social/share-actions";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import { useI18n } from "@/features/i18n/provider";

const SEARCH_DEBOUNCE_MS = 300;

type ShareableProblem = Awaited<ReturnType<typeof getShareableProblems>>[number];

export function ShareProblemDialog({
  conversationId,
  onShared,
}: {
  conversationId: string;
  onShared: () => void;
}) {
  const { messages } = useI18n();
  const t = messages.social;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [problems, setProblems] = useState<ShareableProblem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        setProblems(await getShareableProblems(query));
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, open]);

  function handleShare(problemId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await shareProblem(conversationId, problemId);
        setOpen(false);
        setQuery("");
        setProblems(null);
        onShared();
      } catch {
        setError(t.shareFailed);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setProblems(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label={t.shareProblem}>
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.shareProblemDialogTitle}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.shareSearchPlaceholder}
        />
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {problems === null ? (
            <p className="text-muted-foreground p-3 text-center text-sm">…</p>
          ) : problems.length === 0 ? (
            <p className="text-muted-foreground p-3 text-center text-sm">{t.shareEmpty}</p>
          ) : (
            problems.map((problem) => (
              <button
                key={problem.id}
                type="button"
                disabled={isPending}
                onClick={() => handleShare(problem.id)}
                className="hover:bg-muted flex items-start gap-2 rounded-lg border p-2.5 text-left disabled:opacity-50"
              >
                <BookOpen className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {problem.subject && (
                      <SubjectChip name={problem.subject.name} color={problem.subject.color} />
                    )}
                    <span className="text-muted-foreground text-xs">
                      {DIFFICULTY_LABEL[problem.difficulty]}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{problem.prompt}</p>
                </div>
              </button>
            ))
          )}
        </div>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
