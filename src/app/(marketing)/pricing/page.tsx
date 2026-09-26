import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Brain, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "StudyOS 무료 학습 공간",
  description: "문제 풀이, 학습 계획, 복습, AI 학습 도움을 StudyOS에서 시작하세요.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "StudyOS 무료 학습 공간",
    description: "문제 풀이부터 복습까지, StudyOS를 무료로 사용할 수 있습니다.",
    url: "/pricing",
    locale: "ko_KR",
    siteName: "StudyOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyOS 무료 학습 공간",
    description: "문제 풀이부터 복습까지, StudyOS를 무료로 사용할 수 있습니다.",
  },
};

const learningTools = [
  { icon: ListChecks, title: "학습 계획", copy: "목표와 할 일을 정리하고 오늘의 진도를 확인해요." },
  { icon: BookOpenCheck, title: "문제와 복습", copy: "문제를 풀고 오답을 다음 학습으로 연결해요." },
  { icon: Brain, title: "AI 학습 도움", copy: "질문하고 설명을 들으며 막힌 부분을 살펴봐요." },
  { icon: Sparkles, title: "학습 기록", copy: "세션과 진행 상황을 한곳에서 확인해요." },
];

export default function PricingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16 sm:px-6">
      <header className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium">
          StudyOS Free
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">공부의 흐름을 한곳에서</h1>
        <p className="text-muted-foreground text-pretty">
          StudyOS를 무료로 사용할 수 있습니다. 계획하고, 문제를 풀고, 복습하며 오늘의 공부를 이어가세요.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/signup">공부 시작하기</Link></Button>
          <Button asChild variant="outline"><Link href="/demo">먼저 둘러보기</Link></Button>
        </div>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="StudyOS 학습 도구">
        {learningTools.map(({ icon: Icon, title, copy }) => (
          <Card key={title}>
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <Icon className="text-primary size-5" aria-hidden />
              <h2 className="font-medium">{title}</h2>
              <p className="text-muted-foreground text-sm">{copy}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
