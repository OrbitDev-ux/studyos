"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RootError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <AlertTriangle className="text-muted-foreground size-8" />
      <div>
        <h1 className="text-lg font-semibold">문제가 발생했습니다</h1>
        <p className="text-muted-foreground mt-1 text-sm">잠시 후 다시 시도해주세요.</p>
      </div>
      <Button type="button" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
