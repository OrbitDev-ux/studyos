import type { TourStep } from "@/features/onboarding/steps";

/**
 * Demo onboarding flow — walks a first-time visitor through the whole StudyOS
 * loop end to end. Reuses the same OnboardingTour spotlight component as the
 * real app; targets are `data-tour` anchors on the demo dashboard (missing
 * anchors gracefully fall back to a centered card). CTAs navigate to the public
 * /demo/* pages. Completion is client-only (no server write).
 */
export const DEMO_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "👋 StudyOS 둘러보기",
    body: "StudyOS는 학습 기록을 분석해 오늘 할 공부를 알려주는 학습 OS예요. 계정 없이 핵심 기능을 직접 체험해볼까요?",
    target: null,
  },
  {
    id: "dashboard",
    title: "🏠 대시보드",
    body: "여기에서 오늘의 학습 현황을 한눈에 볼 수 있어요. 연속 학습, 정답률, 레벨까지요.",
    target: null,
  },
  {
    id: "mission",
    title: "🎯 오늘의 미션",
    body: "StudyOS가 오늘 추천하는 학습이에요. 복습과 약점 연습이 우선순위대로 표시돼요.",
    target: "daily-mission",
  },
  {
    id: "solve",
    title: "📝 문제 풀기",
    body: "실제로 문제를 하나 풀어볼 수 있어요. 푸는 순간 학습 패턴 분석이 시작돼요.",
    target: null,
    cta: { label: "문제 풀어보기", href: "/demo/problems" },
  },
  {
    id: "analyze",
    title: "🧠 결과 분석",
    body: "맞고 틀린 결과가 (데모) 학습 기록에 반영돼요. 반복되는 실수를 찾아 약점으로 분석해요.",
    target: "weakness",
  },
  {
    id: "wrong",
    title: "❌ 오답노트",
    body: "틀린 문제는 오답노트에 모이고, '오답 DNA'가 왜 틀렸는지까지 알려줘요.",
    target: null,
    cta: { label: "오답노트 보기", href: "/demo/review" },
  },
  {
    id: "review",
    title: "🔄 자동 복습",
    body: "틀린 문제는 잊어버리기 전에 다시 풀도록 복습 시점을 계산해요.",
    target: "today-review",
  },
  {
    id: "ai",
    title: "🤖 AI 추천",
    body: "지금 무엇부터 하면 좋은지 StudyOS AI가 순서를 정해줘요.",
    target: "ai-reco",
  },
  {
    id: "stats",
    title: "📊 통계",
    body: "학습 시간, 정답률, 연속 학습이 그래프로 쌓여요.",
    target: null,
    cta: { label: "통계 보기", href: "/demo/analytics" },
  },
  {
    id: "done",
    title: "🎉 준비 끝!",
    body: "이렇게 StudyOS가 여러분의 학습을 분석하고 도와줘요. 내 기록을 저장하려면 계정을 만들어보세요.",
    target: null,
    cta: { label: "무료로 시작하기", href: "/signup" },
  },
];
