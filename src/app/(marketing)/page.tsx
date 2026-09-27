import type { Metadata } from "next";
import Link from "next/link";
import {
  BookMarked,
  ClipboardCheck,
  Dna,
  Eye,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ProductPreview } from "@/components/marketing/product-preview";
import { FaqStructuredData } from "@/components/marketing/structured-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FAQ_ITEMS } from "@/config/faq";
import { FEATURES } from "@/config/features";
import { CONTENT_UPDATED_AT, siteConfig } from "@/config/site";
import { getScheduledThemeEvent } from "@/features/theme-events/theme-event";
import { ThemeEventBanner } from "@/features/theme-events/theme-event-banner";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

// "2026년 8월" — bumped by hand in config/site.ts when homepage content
// actually changes (see CONTENT_UPDATED_AT), not on every render.
const CONTENT_UPDATED_LABEL = new Date(
  `${CONTENT_UPDATED_AT}T00:00:00`,
).toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

// Icons are presentation-only, so they're mapped here by title rather than
// living in the shared config/features.ts (which JSON-LD also reads).
const FEATURE_ICONS: Record<string, LucideIcon> = {
  "AI 문제 생성": Sparkles,
  "오답 DNA 분석": Dna,
  "나만의 교재": BookMarked,
  모의고사: ClipboardCheck,
  "공부시간·목표 관리": Target,
  "친구·랭킹·배틀": Users,
};

// No auth() here so this first-impression page stays static and serves from
// the CDN. The CTA points at /signup for everyone; a logged-in visitor is
// redirected on to /dashboard by middleware, so the link still works for both.
export default function LandingPage() {
  const themeEvent = getScheduledThemeEvent();
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 pt-12 pb-12 text-center sm:px-6 sm:pt-16 sm:pb-16">
        <span className="text-muted-foreground bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
          <Sparkles className="size-3.5" />
          AI 학습 플랫폼
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {siteConfig.name}
          <br />
          오늘의 공부를 이어가는 AI 학습 공간
        </h1>
        <p className="text-muted-foreground max-w-xl text-base text-balance sm:text-lg">
          문제를 풀고, 모르는 개념을 묻고, 다음 복습까지. 필요한 학습 도구를 한곳에서
          이어서 사용하세요.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="px-6 text-base">
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-6 text-base">
            <Link href="/demo">
              <Eye className="size-4" aria-hidden />
              로그인 없이 둘러보기
            </Link>
          </Button>
        </div>
        {themeEvent && (
          <ThemeEventBanner event={{
            name: themeEvent.name,
            copy: themeEvent.copy,
            theme: themeEvent.theme,
            startsAt: themeEvent.startsAt.toISOString(),
            endsAt: themeEvent.endsAt.toISOString(),
          }} />
        )}
      </section>

      <section className="landing-preview mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20">
        <ProductPreview />
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">
          학생을 위한 핵심 기능
        </h2>
        <p className="text-muted-foreground mx-auto mb-6 max-w-xl text-center text-sm text-balance">
          {siteConfig.name}는 문제 생성부터 오답 분석, 시험 대비, 일상 공부 관리까지
          학생에게 필요한 기능을 한 곳에 모았어요.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = FEATURE_ICONS[feature.title] ?? Sparkles;
            return (
              <Card key={feature.title}>
                <CardContent className="flex flex-col gap-2.5">
                  <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                    <Icon className="size-4.5" />
                  </span>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 pb-24 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">StudyOS를 무료로 사용할 수 있습니다</h2>
        <p className="text-muted-foreground max-w-xl text-sm text-balance">
          계획, 문제 풀이, 복습, AI 학습 도움을 한곳에서 시작해보세요.
        </p>
        <Button asChild variant="outline"><Link href="/pricing">StudyOS 살펴보기</Link></Button>
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

      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 pb-24 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">지금 바로 시작해보세요</h2>
        <p className="text-muted-foreground max-w-md text-sm text-balance">
          가입 없이 데모로 둘러보거나 무료 계정으로 오늘의 공부를 시작하세요.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="px-6 text-base">
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-6 text-base">
            <Link href="/demo">
              <Eye className="size-4" aria-hidden />
              로그인 없이 둘러보기
            </Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-1.5 px-4 pb-16 text-center sm:px-6">
        <p className="text-muted-foreground text-xs">
          <Link href="/legal/ai" className="hover:text-foreground hover:underline">
            StudyOS의 AI 이용 안내
          </Link>
          {" · "}
          <Link href="/contact" className="hover:text-foreground hover:underline">
            문의하기
          </Link>
        </p>
        <p className="text-muted-foreground text-xs">
          마지막 업데이트: {CONTENT_UPDATED_LABEL}
        </p>
      </div>

      <FaqStructuredData />
    </main>
  );
}
