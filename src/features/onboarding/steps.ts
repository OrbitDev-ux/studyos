/**
 * Onboarding tour step definitions — pure data, no React/DOM, so the flow can be
 * unit-tested and shared. The tour is a spotlight overlay: a step with a
 * `target` highlights the real UI element carrying `data-tour="<target>"`; a
 * null target renders a centered card. Guests get a shorter flow that ends by
 * inviting sign-up (without nagging), logged-in users get the full tour.
 */
export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** `data-tour` id of the element to spotlight, or null for a centered card. */
  target: string | null;
  /** Optional navigation CTA (e.g. go solve a problem). */
  cta?: { label: string; href: string };
};

export const LOGGED_IN_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "👋 StudyOS에 오신 것을 환영해요",
    body: "StudyOS는 여러분의 학습 기록을 분석해서 오늘 필요한 공부를 알려주는 학습 OS예요. 1분만 둘러볼까요?",
    target: null,
  },
  {
    id: "daily-mission",
    title: "🎯 오늘의 미션",
    body: "여기에서 오늘 StudyOS가 추천하는 학습을 확인할 수 있어요. 복습과 약점 연습이 우선순위대로 표시돼요.",
    target: "daily-mission",
  },
  {
    id: "solve",
    title: "📝 문제를 하나 풀어볼게요",
    body: "StudyOS는 문제를 풀면서 여러분의 학습 패턴을 알아가요. 지금 문제를 풀어보면 나머지 기능이 살아나요.",
    target: "weak-problems",
    cta: { label: "문제 풀어보기", href: "/problems" },
  },
  {
    id: "record",
    title: "🧠 푼 결과가 학습 기록에 저장돼요",
    body: "맞고 틀린 모든 풀이가 기록으로 남아요. 틀린 문제와 반복되는 실수를 분석해서 약점을 찾아냅니다.",
    target: null,
  },
  {
    id: "weakness",
    title: "🎯 그래서 오늘 할 공부를 정해줘요",
    body: "취약 개념 분석이 지금 필요한 학습을 우선순위에 맞춰 보여줘요. 데이터가 쌓일수록 더 정확해져요.",
    target: "weakness",
  },
  {
    id: "review",
    title: "🔄 틀린 문제는 자동 복습으로 관리돼요",
    body: "잊어버리기 전에 다시 풀 수 있도록 복습 시점을 계산해요. '오늘 복습'에서 확인할 수 있어요.",
    target: "today-review",
  },
  {
    id: "done",
    title: "🎉 준비 끝!",
    body: "이제 StudyOS가 여러분의 학습을 도와줄 거예요. 첫 문제를 풀며 시작해볼까요?",
    target: null,
    cta: { label: "오늘의 학습 시작", href: "/problems" },
  },
];

export const GUEST_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "👋 StudyOS 둘러보기",
    body: "StudyOS는 학습 기록을 분석해 오늘 할 공부를 추천하는 학습 OS예요. 게스트로 자유롭게 체험해보세요.",
    target: null,
  },
  {
    id: "solve",
    title: "📝 문제를 하나 풀어보세요",
    body: "문제를 풀면 StudyOS가 여러분의 학습 패턴을 분석하기 시작해요.",
    target: "weak-problems",
    cta: { label: "문제 체험하기", href: "/problems" },
  },
  {
    id: "record",
    title: "🧠 결과가 분석돼요",
    body: "푼 결과로 약점을 찾아 오늘의 미션과 복습을 만들어줘요. 대시보드에서 확인할 수 있어요.",
    target: "daily-mission",
  },
  {
    id: "signup",
    title: "💾 기록을 계속 저장하려면",
    body: "게스트 기록은 임시로 보관돼요. 로그인하면 학습 기록과 개인화가 계속 이어져요.",
    target: null,
    cta: { label: "회원가입하고 계속하기", href: "/signup" },
  },
];

export function stepsFor(isGuest: boolean): TourStep[] {
  return isGuest ? GUEST_STEPS : LOGGED_IN_STEPS;
}
