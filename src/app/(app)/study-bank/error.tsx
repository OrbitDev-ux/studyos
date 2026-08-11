"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Route error boundary — shows a safe message (never the raw error) + retry. */
export default function StudyBankError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for debugging; the user only ever sees the safe copy below.
    console.error("study-bank route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-sm font-medium">문제 목록을 불러오지 못했습니다.</p>
      <p className="text-muted-foreground text-sm">잠시 후 다시 시도해주세요.</p>
      <Button type="button" variant="outline" size="sm" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
