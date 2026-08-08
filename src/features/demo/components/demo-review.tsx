"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import {
  DEMO_ERROR_TYPE_LABEL,
  DEMO_REVIEW_SCHEDULE,
  DEMO_WRONG_ANSWERS,
  type DemoWrongAnswer,
} from "@/features/demo/data";

function WrongAnswerItem({ item }: { item: DemoWrongAnswer }) {
  const [showDna, setShowDna] = useState(false);
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">{item.subject}</span>
          <Badge variant="outline">{item.unit}</Badge>
          <Badge variant="outline">{DIFFICULTY_LABEL[item.difficulty]}</Badge>
          <Badge variant="destructive">{DEMO_ERROR_TYPE_LABEL[item.dna.type]}</Badge>
        </div>

        <p className="text-sm font-medium whitespace-pre-wrap">{item.prompt}</p>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="bg-destructive/5 rounded-md p-2">
            <p className="text-muted-foreground text-xs">내 답</p>
            <p className="text-destructive font-medium">{item.myAnswer}</p>
          </div>
          <div className="bg-primary/5 rounded-md p-2">
            <p className="text-muted-foreground text-xs">정답</p>
            <p className="text-primary font-medium">{item.correctAnswer}</p>
          </div>
        </div>

        <div className="bg-muted text-muted-foreground rounded-md p-3 text-xs">
          <p className="whitespace-pre-wrap">{item.explanation}</p>
        </div>

        {!showDna ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() => setShowDna(true)}
          >
            🧬 오답 원인 분석 (오답 DNA)
          </Button>
        ) : (
          <div className="bg-muted flex flex-col gap-1 rounded-md p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-medium">
                {DEMO_ERROR_TYPE_LABEL[item.dna.type]}
              </span>
              <span className="font-medium">{item.dna.concept}</span>
            </div>
            <p className="text-muted-foreground">{item.dna.reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DemoReview() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <NotebookPen className="size-5" /> 오답노트
      </h1>

      <Card>
        <CardContent className="flex flex-wrap gap-4">
          {DEMO_REVIEW_SCHEDULE.map((row) => (
            <div key={row.label} className="flex flex-col">
              <span className="text-muted-foreground text-xs">{row.label}</span>
              <span className="text-lg font-semibold tabular-nums">{row.count}개</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {DEMO_WRONG_ANSWERS.map((item) => (
          <WrongAnswerItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
