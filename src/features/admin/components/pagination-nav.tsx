import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Prev / page-indicator / Next, driven by URL params so pagination survives
 * refresh and is shareable. `hrefForPage` builds the target URL for a page. */
export function PaginationNav({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs">
        {page} / {totalPages} 페이지
      </p>
      <div className="flex items-center gap-1">
        <Button
          asChild={hasPrev}
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          className={cn(!hasPrev && "pointer-events-none opacity-50")}
        >
          {hasPrev ? (
            <Link href={hrefForPage(page - 1)} aria-label="이전 페이지">
              <ChevronLeft className="size-4" />
              이전
            </Link>
          ) : (
            <span>
              <ChevronLeft className="size-4" />
              이전
            </span>
          )}
        </Button>
        <Button
          asChild={hasNext}
          variant="outline"
          size="sm"
          disabled={!hasNext}
          className={cn(!hasNext && "pointer-events-none opacity-50")}
        >
          {hasNext ? (
            <Link href={hrefForPage(page + 1)} aria-label="다음 페이지">
              다음
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span>
              다음
              <ChevronRight className="size-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
