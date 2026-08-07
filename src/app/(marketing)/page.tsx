import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

const FEATURES = [
  {
    title: "AI 문제 생성",
    description: "과목과 단원만 정하면 AI가 난이도별 문제를 바로 만들어줘요.",
  },
  {
    title: "오답노트 자동 분석",
    description: "틀린 문제를 모아 취약 단원과 개선 방향을 AI가 분석해요.",
  },
  {
    title: "학습 리포트",
    description: "공부시간·Todo·모의고사 데이터를 바탕으로 주간 리포트를 받아보세요.",
  },
];

// No auth() here so this first-impression page stays static and serves from
// the CDN. The CTA points at /signup for everyone; a logged-in visitor is
// redirected on to /dashboard by middleware, so the link still works for both.
export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 sm:py-32">
        <span className="text-muted-foreground bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
          <Sparkles className="size-3.5" />
          AI 학습 플랫폼
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          AI가 문제를 만들고
          <br />
          공부를 분석하는 학습 플랫폼
        </h1>
        <p className="text-muted-foreground max-w-xl text-base text-balance sm:text-lg">
          {siteConfig.name}는 Todo·목표·통계 같은 기본 공부 관리부터 AI 문제 생성,
          오답노트, 모의고사, 친구와의 랭킹·배틀까지 한 곳에서 관리하는 학생용 올인원
          플랫폼입니다.
        </p>
        <Button asChild size="lg" className="h-11 px-6 text-base">
          <Link href="/signup">무료로 시작하기</Link>
        </Button>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20">
        <ProductPreview />
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="flex flex-col gap-1.5">
                <h2 className="text-sm font-semibold">{feature.title}</h2>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
