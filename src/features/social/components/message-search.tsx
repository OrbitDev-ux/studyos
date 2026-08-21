"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchConversationMessages } from "@/features/social/message-actions";
import { useI18n } from "@/features/i18n/provider";
import { formatShortDate } from "@/lib/date";

const SEARCH_DEBOUNCE_MS = 300;

type SearchResult = { id: string; content: string; createdAt: Date };

export function MessageSearch({
  conversationId,
  onResultClick,
}: {
  conversationId: string;
  onResultClick: (messageId: string) => void;
}) {
  const { messages, locale } = useI18n();
  const t = messages.social;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await searchConversationMessages(conversationId, query);
        setResults(found);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, conversationId]);

  if (!open) {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={t.searchPlaceholder}
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>
    );
  }

  return (
    <div className="relative w-full max-w-64">
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={messages.common.cancel}
          onClick={() => {
            setOpen(false);
            setQuery("");
            setResults(null);
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
      {query.trim() && (
        <div className="bg-popover absolute top-full right-0 left-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border shadow-md">
          {isPending ? (
            <p className="text-muted-foreground p-3 text-xs">…</p>
          ) : !results || results.length === 0 ? (
            <p className="text-muted-foreground p-3 text-xs">{t.searchEmpty}</p>
          ) : (
            <>
              <p className="text-muted-foreground px-3 pt-2 text-[11px]">
                {t.searchResultsCount.replace("{count}", String(results.length))}
              </p>
              <ul>
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="hover:bg-muted flex w-full flex-col gap-0.5 px-3 py-2 text-left"
                      onClick={() => {
                        onResultClick(r.id);
                        setOpen(false);
                        setQuery("");
                        setResults(null);
                      }}
                    >
                      <span className="truncate text-sm">{r.content}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {formatShortDate(new Date(r.createdAt), locale)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
