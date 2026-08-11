import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, PLAN_META, TRIAL_DAYS, type Plan } from "@/features/billing/plans";
import {
  canUseFeature,
  getFeatureLimit,
  getThemeAccess,
  getUsageWindow,
  shouldShowAds,
  type Limit,
} from "@/features/billing/entitlements";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "요금제 — StudyOS",
  description: "StudyOS Trial · Pro · Premium 플랜을 비교해보세요.",
};

function dailyLabel(limit: Limit, unit: string): string {
  return limit === null ? "무제한" : `${limit}회 / ${unit}`;
}

function mockLabel(plan: Plan): string {
  const limit = getFeatureLimit(plan, "MOCK_EXAM_GENERATION");
  if (limit === null) return "무제한";
  const w = getUsageWindow(plan, "MOCK_EXAM_GENERATION");
  const unit = w === "trial" ? "체험" : w === "month" ? "월" : "일";
  return `${limit}회 / ${unit}`;
}

function themeLabel(access: "none" | "some" | "all"): string {
  return access === "all" ? "전체" : access === "some" ? "일부" : "기본";
}

/**
 * 요금제 가치 서사 — 숫자 한도 비교표 위에 "누구에게 필요한지"와 "무엇을
 * 풀어주는지"를 감정적으로 프레이밍한다. 한도 표(rowsFor)는 근거로 남긴다.
 */
const PLAN_PITCH: Record<Plan, { persona: string; unlocks: string[] }> = {
  TRIAL: {
    persona: "StudyOS를 처음 써본다면",
    unlocks: ["7일간 모든 기능을 제한 없이", "결제 없이 바로 시작"],
  },
  PRO: {
    persona: "매일 오답노트를 관리하는 학생이라면",
    unlocks: ["AI 문제를 넉넉하게 생성하고", "취약 단원을 자동으로 찾아 집중 공략"],
  },
  PREMIUM: {
    persona: "모의고사를 자주 보는 수험생이라면",
    unlocks: ["생성·분석을 제한 없이", "고급 AI 추천으로 실전까지 대비"],
  },
};

type Row = { label: string; value: string | boolean };

function rowsFor(plan: Plan): Row[] {
  return [
    { label: "AI 문제 생성", value: dailyLabel(getFeatureLimit(plan, "AI_PROBLEM_GENERATION"), "일") },
    { label: "모의고사 생성", value: mockLabel(plan) },
    { label: "기본 학습 통계", value: canUseFeature(plan, "BASIC_ANALYTICS") },
    { label: "상세/고급 통계", value: canUseFeature(plan, "ADVANCED_ANALYTICS") },
    { label: "오답 DNA", value: canUseFeature(plan, "WRONG_ANSWER_DNA") },
    { label: "간격 반복 복습", value: canUseFeature(plan, "SPACED_REPETITION") },
    { label: "AI 학습 추천", value: canUseFeature(plan, "AI_RECOMMENDATION") },
    { label: "고급 AI 추천", value: canUseFeature(plan, "ADVANCED_AI_RECOMMENDATION") },
    { label: "추가 테마", value: themeLabel(getThemeAccess(plan)) },
    { label: "광고", value: shouldShowAds(plan) ? "표시" : "없음" },
  ];
}

function RowValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="text-success size-4" aria-label="포함" />
    ) : (
      <Minus className="text-muted-foreground size-4" aria-label="미포함" />
    );
  }
  return <span className="text-sm tabular-nums">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">요금제</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          가입하면 {TRIAL_DAYS}일간 모든 기능을 무료로 체험할 수 있어요. 유료 결제는
          출시 준비 중입니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const meta = PLAN_META[plan];
          const highlight = plan === "PRO";
          const isPaid = plan !== "TRIAL";
          return (
            <Card
              key={plan}
              className={cn(
                "relative flex flex-col",
                highlight && "border-primary ring-primary/20 shadow-md ring-1",
              )}
            >
              {highlight && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">추천</Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between gap-2">
                  <span className="text-lg">{meta.name}</span>
                  <span className="text-sm font-normal">{meta.priceLabel}</span>
                </CardTitle>
                <p className="text-muted-foreground text-xs">{meta.tagline}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {/* 가치 서사: 페르소나 + 이 플랜이 풀어주는 문제 */}
                <div
                  className={cn(
                    "flex flex-col gap-2 rounded-lg p-3",
                    highlight ? "bg-primary/8" : "bg-muted/50",
                  )}
                >
                  <p className="text-sm font-medium">{PLAN_PITCH[plan].persona}</p>
                  <ul className="flex flex-col gap-1">
                    {PLAN_PITCH[plan].unlocks.map((line) => (
                      <li
                        key={line}
                        className="text-muted-foreground flex items-start gap-1.5 text-xs"
                      >
                        <Check className="text-success mt-0.5 size-3.5 shrink-0" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <ul className="flex flex-col gap-2">
                  {rowsFor(plan).map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between gap-2 border-b pb-2 text-sm last:border-0"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <RowValue value={row.value} />
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-col gap-2">
                  {isPaid ? (
                    <>
                      {/* 결제 미구현: 동작하지 않는 "시작하기" 대신 정직하게 출시 예정으로 표기 */}
                      <Button className="w-full" variant="outline" disabled>
                        출시 예정
                      </Button>
                      <p className="text-muted-foreground text-center text-xs">
                        지금은 {TRIAL_DAYS}일 무료 체험으로 전체 기능을 써볼 수 있어요.
                      </p>
                    </>
                  ) : (
                    <>
                      <Button asChild className="w-full">
                        <Link href="/signup">무료로 시작하기</Link>
                      </Button>
                      <p className="text-muted-foreground text-center text-xs">
                        {TRIAL_DAYS}일 체험이며 영구 무료 플랜은 아니에요. 종료 후에는
                        일부 기능이 제한됩니다.
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
