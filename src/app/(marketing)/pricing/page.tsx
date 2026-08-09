import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, PLAN_META, type Plan } from "@/features/billing/plans";
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
      <Check className="text-primary size-4" aria-label="포함" />
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
        <p className="text-muted-foreground text-sm">
          StudyOS를 {PLAN_META.TRIAL.tagline}. 필요에 맞는 플랜을 선택하세요.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const meta = PLAN_META[plan];
          const highlight = plan === "PRO";
          return (
            <Card key={plan} className={cn(highlight && "border-primary")}>
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between gap-2">
                  <span className="text-lg">{meta.name}</span>
                  <span className="text-sm font-normal">{meta.priceLabel}</span>
                </CardTitle>
                <p className="text-muted-foreground text-xs">{meta.tagline}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
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
                <Button
                  asChild
                  className="w-full"
                  variant={highlight ? "default" : "outline"}
                >
                  <Link href="/signup">
                    {plan === "TRIAL" ? "무료로 시작하기" : `${meta.name} 시작하기`}
                  </Link>
                </Button>
                {plan !== "TRIAL" && (
                  <p className="text-muted-foreground text-center text-xs">
                    결제 연동은 준비 중입니다.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
