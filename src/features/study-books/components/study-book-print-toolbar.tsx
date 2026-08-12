"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INCLUDE_LEVELS,
  type IncludeLevel,
} from "@/features/study-books/print/options";

/**
 * Screen-only toolbar above the printable book: back link, include-level
 * selector (문제만 / +정답 / +해설), and "인쇄 / PDF 저장" (window.print). Hidden in
 * print via .book-toolbar { display:none } in @media print.
 *
 * The include selector navigates (server re-renders the document) so the printed
 * output always matches the selection. `chapterId` is preserved so 현재 챕터 저장
 * stays scoped while switching levels.
 */
export function StudyBookPrintToolbar({
  bookId,
  chapterId,
  include,
}: {
  bookId: string;
  chapterId?: string;
  include: IncludeLevel;
}) {
  const hrefFor = (level: IncludeLevel) => {
    const params = new URLSearchParams();
    params.set("include", level);
    if (chapterId) params.set("chapter", chapterId);
    return `/study-books/${bookId}/print?${params.toString()}`;
  };

  return (
    <div className="book-toolbar">
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <Link href={`/study-books/${bookId}`}>
          <ArrowLeft className="size-4" />
          돌아가기
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-muted flex rounded-lg p-0.5" role="group" aria-label="포함 범위">
          {INCLUDE_LEVELS.map((lvl) => (
            <Link
              key={lvl.id}
              href={hrefFor(lvl.id)}
              aria-current={include === lvl.id ? "true" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                include === lvl.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {lvl.label}
            </Link>
          ))}
        </div>

        <Button type="button" size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="size-4" />
          인쇄 / PDF 저장
        </Button>
      </div>
    </div>
  );
}
