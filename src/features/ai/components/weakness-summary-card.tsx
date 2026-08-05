"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateWeaknessAnalysis } from "@/features/ai/actions";

export function WeaknessSummaryCard({
  initialContent,
}: {
  initialContent: string | null;
}) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateWeaknessAnalysis();
      setContent(result.content);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>취약 단원 분석</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleGenerate}
        >
          {isPending ? "분석 중..." : content ? "다시 분석" : "분석하기"}
        </Button>
      </CardHeader>
      <CardContent>
        {content ? (
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            오답노트 데이터를 바탕으로 취약한 과목·단원을 분석해드려요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
