"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateWeeklyReport } from "@/features/ai/actions";

export function WeeklyReportCard({ initialContent }: { initialContent: string | null }) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateWeeklyReport();
      setContent(result.content);
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
