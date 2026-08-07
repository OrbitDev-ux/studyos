"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="text-destructive size-8" />
      <div>
        <h2 className="text-lg font-semibold">문제가 발생했습니다</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          관리자 페이지를 불러오는 중 오류가 발생했습니다.
        </p>
      </div>
      <Button type="button" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
