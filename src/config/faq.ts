import { PLAN_META, TRIAL_DAYS } from "@/features/billing/plans";

/**
 * Landing-page FAQ — the single source shared by the visible section and the
 * FAQPage JSON-LD. Google requires the structured data to match the on-page
 * content exactly, so both must read from here. Prices come from PLAN_META so
 * they never drift from the pricing page.
 */
export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "StudyOS는 어떤 서비스인가요?",
    answer:
      "AI 문제 생성, 오답 DNA 분석, 취약점 기반 개인화 교재, 모의고사, 그리고 Todo·목표·공부시간·연속 공부일(스트릭) 공부 관리를 한 곳에서 제공하는 학생용 올인원 학습 플랫폼입니다.",
  },
  {
    question: "무료로 사용할 수 있나요?",
    answer: `회원가입하면 ${TRIAL_DAYS}일간 무료로 체험할 수 있습니다. 이후에는 ${PLAN_META.PRO.priceLabel}의 Pro, ${PLAN_META.PREMIUM.priceLabel}의 Premium 유료 플랜이 준비되어 있으며, 결제 연동은 순차적으로 열릴 예정입니다.`,
  },
  {
    question: "로그인 없이 둘러볼 수 있나요?",
    answer:
      "네, 데모 페이지에서 로그인이나 가입 없이 대시보드·문제 생성·오답노트·모의고사 등 주요 기능을 미리 체험할 수 있습니다.",
  },
  {
    question: "AI 문제는 어떻게 만들어지나요?",
    answer:
      "과목·단원·난이도를 선택하면 AI가 그에 맞는 문제와 해설을 즉시 생성합니다. 틀린 문제는 오답노트에서 왜 틀렸는지까지 분석해줍니다.",
  },
  {
    question: "어떤 기기에서 사용할 수 있나요?",
    answer: "웹 기반 서비스로 PC와 모바일 브라우저 모두에서 사용할 수 있습니다.",
  },
];
