/**
 * Landing-page feature highlights — the single source shared by the visible
 * section and the SoftwareApplication JSON-LD `featureList`. Icons are mapped
 * separately in the page component since JSON-LD only needs plain text.
 */
export const FEATURES: { title: string; description: string }[] = [
  {
    title: "AI 문제 생성",
    description: "과목과 단원만 정하면 AI가 난이도별 문제를 바로 만들어줘요.",
  },
  {
    title: "오답 DNA 분석",
    description:
      "틀린 문제의 '왜 틀렸는지'까지 유형화해, 반복되는 실수 패턴을 짚어줍니다.",
  },
  {
    title: "나만의 교재",
    description:
      "내 취약점에 맞춰 진화하는 교재. 풀수록 나에게 최적화된 한 권이 완성돼요.",
  },
  {
    title: "모의고사",
    description: "OMR 답안지와 타이머로 실전처럼 풀고, 채점과 해설까지 바로 받아요.",
  },
  {
    title: "공부시간·목표 관리",
    description: "Todo와 목표를 정하고 공부 시간을 기록하며 연속 공부일을 이어가요.",
  },
  {
    title: "친구·랭킹·배틀",
    description: "친구와 순위를 겨루거나 실시간 문제풀이 배틀로 함께 공부해요.",
  },
];
