/**
 * Tutor 과목/학년 설정 — 코드 config(하드코딩 아님). 새 과목/학년은 여기 한 줄로 추가.
 */

export const TUTOR_SUBJECTS = [
  { id: "math", label: "수학", emoji: "🔢" },
  { id: "english", label: "영어", emoji: "🔤" },
  { id: "korean", label: "국어", emoji: "📖" },
  { id: "science", label: "과학", emoji: "🔬" },
  { id: "social", label: "사회", emoji: "🌍" },
] as const;

export type TutorSubjectId = (typeof TUTOR_SUBJECTS)[number]["id"];

export const TUTOR_SUBJECT_IDS = TUTOR_SUBJECTS.map((s) => s.id) as [
  TutorSubjectId,
  ...TutorSubjectId[],
];

export const TUTOR_SUBJECT_LABEL = Object.fromEntries(
  TUTOR_SUBJECTS.map((s) => [s.id, s.label]),
) as Record<TutorSubjectId, string>;

/** Grade levels drive explanation difficulty (§6 초등학생 handling). */
export const TUTOR_GRADES = [
  {
    id: "elem_low",
    label: "초등 저학년",
    guidance:
      "아주 쉬운 말과 짧은 문장, 친근한 예시로 설명한다. 전문용어는 피하고 한 번에 한 단계씩 천천히 안내한다.",
  },
  {
    id: "elem_high",
    label: "초등 고학년",
    guidance: "쉬운 용어와 단계별 설명을 사용하되 기초 개념 용어는 조금씩 소개한다.",
  },
  {
    id: "middle",
    label: "중학교",
    guidance: "교과 용어를 정확히 사용하되 개념의 이유와 과정을 함께 설명한다.",
  },
  {
    id: "high",
    label: "고등학교",
    guidance: "정확한 용어와 논리적 과정을 갖춰 설명하고, 심화 개념 연결도 제시한다.",
  },
] as const;

export type TutorGradeId = (typeof TUTOR_GRADES)[number]["id"];

export const TUTOR_GRADE_IDS = TUTOR_GRADES.map((g) => g.id) as [
  TutorGradeId,
  ...TutorGradeId[],
];

export const TUTOR_GRADE_LABEL = Object.fromEntries(
  TUTOR_GRADES.map((g) => [g.id, g.label]),
) as Record<TutorGradeId, string>;

export function tutorGradeGuidance(id: string): string {
  return TUTOR_GRADES.find((g) => g.id === id)?.guidance ?? TUTOR_GRADES[1].guidance;
}

export function tutorSubjectLabel(id: string): string {
  return TUTOR_SUBJECT_LABEL[id as TutorSubjectId] ?? id;
}

export function tutorGradeLabel(id: string): string {
  return TUTOR_GRADE_LABEL[id as TutorGradeId] ?? id;
}
