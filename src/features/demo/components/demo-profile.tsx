"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEMO_FRIENDS, DEMO_STUDENT } from "@/features/demo/data";
import { useDemo } from "@/features/demo/state";

export function DemoProfile() {
  const { exp, level, levelProgressPercent } = useDemo();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <UserRound className="size-5" /> 프로필
      </h1>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full text-xl font-bold">
              {DEMO_STUDENT.name.slice(0, 1)}
            </div>
            <div>
              <p className="text-lg font-semibold">{DEMO_STUDENT.name}</p>
              <p className="text-muted-foreground text-sm">{DEMO_STUDENT.grade}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted rounded-md p-3">
              <p className="text-muted-foreground text-xs">Study EXP</p>
              <p className="text-lg font-semibold tabular-nums">{exp.toLocaleString()}</p>
            </div>
            <div className="bg-muted rounded-md p-3">
              <p className="text-muted-foreground text-xs">Level</p>
              <p className="text-lg font-semibold tabular-nums">{level}</p>
            </div>
            <div className="bg-muted rounded-md p-3">
              <p className="text-muted-foreground text-xs">친구</p>
              <p className="text-lg font-semibold tabular-nums">{DEMO_STUDENT.friendCount}명</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">다음 레벨까지</span>
              <span className="tabular-nums">
                {exp.toLocaleString()} / {DEMO_STUDENT.expForNextLevel.toLocaleString()}
              </span>
            </div>
            <Progress value={Math.max(0, Math.min(100, levelProgressPercent))} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">친구 ({DEMO_FRIENDS.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {DEMO_FRIENDS.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-medium">
                  {f.name.slice(0, 1)}
                </div>
                <span className="font-medium">{f.name}</span>
                <span className="text-muted-foreground text-xs">Lv.{f.level}</span>
              </div>
              <span
                className={
                  f.status === "온라인" ? "text-xs text-emerald-500" : "text-muted-foreground text-xs"
                }
              >
                {f.status}
              </span>
            </div>
          ))}
          <p className="text-muted-foreground mt-1 text-xs">Demo 친구 목록입니다 (실제 사용자 아님).</p>
        </CardContent>
      </Card>

      <Button asChild className="self-start">
        <Link href="/signup">내 프로필 만들기</Link>
      </Button>
    </div>
  );
}
