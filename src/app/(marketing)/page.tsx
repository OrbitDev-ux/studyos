import type { Metadata } from "next";
import Link from "next/link";
import { BookMarked, Dna, Sparkles, type LucideIcon } from "lucide-react";
import { ProductPreview } from "@/components/marketing/product-preview";
import { FaqStructuredData } from "@/components/marketing/structured-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FAQ_ITEMS } from "@/config/faq";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const FEATURES: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "AI 문제 생성",
    description: "과목과 단원만 정하면 AI가 난이도별 문제를 바로 만들어줘요.",
    icon: Sparkles,
  },
  {
    title: "오답 DNA 분석",
    description:
      "틀린 문제의 '왜 틀렸는지'까지 유형화해, 반복되는 실수 패턴을 짚어줍니다.",
    icon: Dna,
  },
  {
    title: "나만의 교재",
    description:
      "내 취약점에 맞춰 진화하는 교재. 풀수록 나에게 최적화된 한 권이 완성돼요.",
    icon: BookMarked,
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
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="px-6 text-base">
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-6 text-base">
            <Link href="/demo">👀 로그인 없이 둘러보기</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20">
        <ProductPreview />
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="flex flex-col gap-2.5">
                <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                  <feature.icon className="size-4.5" />
                </span>
                <h2 className="text-sm font-semibold">{feature.title}</h2>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">
          자주 묻는 질문
        </h2>
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item) => (
            <Card key={item.question}>
              <CardContent className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold">{item.question}</h3>
                <p className="text-muted-foreground text-sm">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <FaqStructuredData />
    </main>
  );
}
