"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateWeeklyReport } from "@/features/ai/actions";

export function WeeklyReportCard({ initialContent }: { initialContent: string | null }) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateWeeklyReport();
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setContent(result.content);
      } catch {
        setError("리포트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>주간 학습 리포트</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleGenerate}
        >
          {isPending ? "생성 중..." : content ? "다시 생성" : "생성하기"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive mb-2 text-xs">{error}</p>}
        {content ? (
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            최근 7일간의 공부시간·Todo·모의고사 데이터를 바탕으로 리포트를 만들어드려요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
