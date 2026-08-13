/**
 * StudyOS 실험실(Lab) 기능 카탈로그 — 코드로 정의(하드코딩 아님, 확장 가능한 레지스트리).
 * 새 실험 기능은 여기 한 항목만 추가하면 /lab · 관리자 · 분석에 자동 반영된다.
 * 런타임 상태(활성/비활성, 분석 카운터, 피드백)는 DB(features/lab/state)에서 관리한다.
 */

export type LabStatus = "EXPERIMENTAL" | "BETA" | "STABLE";
export type LabCategory = "AI" | "학습" | "교재";

export type LabFeatureDef = {
  /** Stable key; matches LabFeatureState.key + feedback featureKey. */
  key: string;
  name: string;
  emoji: string;
  description: string;
  status: LabStatus;
  category: LabCategory;
  /** Button label ("사용해보기" / "실험하기" 등). */
  cta: string;
  /** True if running the feature consumes AI generation quota (server enforces
   * the existing usage/entitlement policy via withGenerationQuota). */
  usesAi: boolean;
  /** Access scope. "public" = all logged-in users; "admin" = admins only.
   * Extensible later (e.g. a "beta" tester group) without schema changes. */
  visibility: "public" | "admin";
};

export const LAB_STATUS_LABEL: Record<LabStatus, string> = {
  EXPERIMENTAL: "Experimental",
  BETA: "Beta",
  STABLE: "Stable",
};

export const LAB_STATUS_VARIANT: Record<LabStatus, "default" | "secondary" | "outline"> = {
  EXPERIMENTAL: "outline",
  BETA: "secondary",
  STABLE: "default",
};

export const LAB_CATEGORIES: LabCategory[] = ["AI", "학습", "교재"];

export const LAB_FEATURES: LabFeatureDef[] = [
  {
    key: "AI_LEARNING_COACH",
    name: "AI 학습 코치",
    emoji: "🧠",
    description: "학습 기록을 분석해 오늘 공부할 내용·복습·취약 단원·학습 순서를 제안합니다.",
    status: "BETA",
    category: "AI",
    cta: "사용해보기",
    usesAi: true,
    visibility: "public",
  },
  {
    key: "NEXT_LEARNING_RECOMMENDATION",
    name: "다음 학습 추천",
    emoji: "🎯",
    description: "정답률·오답·약점·복습 예정·최근 학습을 종합해 다음 공부를 추천합니다.",
    status: "EXPERIMENTAL",
    category: "학습",
    cta: "실험하기",
    usesAi: false,
    visibility: "public",
  },
  {
    key: "AUTO_BOOK_ENHANCEMENT",
    name: "자동 교재 보강",
    emoji: "📘",
    description: "취약한 부분을 찾아 관련 문제를 생성하고 나만의 교재에 자동으로 추가합니다.",
    status: "EXPERIMENTAL",
    category: "교재",
    cta: "실험하기",
    usesAi: true,
    visibility: "public",
  },
];

export const LAB_FEATURE_KEYS = LAB_FEATURES.map((f) => f.key);

export function getLabFeature(key: string): LabFeatureDef | undefined {
  return LAB_FEATURES.find((f) => f.key === key);
}
