/**
 * 교육과정 Taxonomy — 정적 참조 데이터 (Static curriculum reference data).
 *
 * Why code and not DB tables: the curriculum tree is static reference data, so
 * it lives in code/config (per the project's guidance) rather than in new
 * `Curriculum*`/`UserSubject`/`UserUnit` tables. Selections are validated
 * against this tree server-side and then resolved onto the EXISTING per-user
 * `Subject` row (by canonical name) and the EXISTING `Problem.unit` string — so
 * `subjectId`/`unit` semantics, and every downstream Learning-OS consumer
 * (ProblemAttempt, Weakness Engine, Daily Mission, Review), keep working
 * unchanged. No schema change, no data migration, no duplicate models.
 *
 * Canonical subject names intentionally match features/subjects/constants.ts
 * DEFAULT_SUBJECTS (수학/영어/국어/과학) so a taxonomy pick maps onto the subject
 * rows every user is already seeded with.
 *
 * Extensibility: this is a bounded-but-real slice (초5·초6 전 과목 + 중·고 수학).
 * Add grades/subjects/units by appending here — the UI, validation, and
 * resolution are all data-driven and need no further code changes. Units carry
 * an optional `subunits` field so 대단원/소단원 can be introduced later without a
 * shape change.
 */

export type SchoolLevel = "ELEMENTARY" | "MIDDLE" | "HIGH";

/**
 * 대한민국 교육과정 개정판. 2022 개정은 학년별로 연차 적용되는 중(2024~2027) —
 * 같은 시점에도 학년마다 실제 적용 중인 개정판이 다르다(정책브리핑
 * https://www.korea.kr/briefing/policyBriefingView.do?newsId=156544066,
 * 교육부 2022년 확정 발표 기준: 초1·2=2024, 초3·4·중1·고1=2025,
 * 초5·6·중2·고2=2026, 중3·고3=2027). 그래서 이 값은 `CURRICULUM_NAME`처럼
 * 트리 전체에 하나가 아니라 학년(`CurriculumGrade`) 단위로 붙는다. 공식 적용
 * 시기가 확인되지 않은 학년은 절대 추측해 채우지 말고 `undefined`로 둔다.
 */
export type RevisionYear = 2015 | 2022;

export type CurriculumUnit = {
  /** Stable slug, unique within its subject. */
  id: string;
  /** Canonical unit name, stored verbatim into Problem.unit. */
  name: string;
  /** Optional 소단원 for future depth; unused by the current UI. */
  subunits?: { id: string; name: string }[];
};

export type CurriculumSubject = {
  /** Stable slug, unique within its grade. */
  id: string;
  /** Canonical subject name — must match a Subject.name (find-or-created). */
  name: string;
  units: CurriculumUnit[];
};

export type CurriculumGrade = {
  /** Stable slug, unique across the curriculum. */
  id: string;
  name: string;
  level: SchoolLevel;
  /** Undefined = 공식 적용 시기 미확인(추측 금지, TODO로 남김). See RevisionYear. */
  revisionYear?: RevisionYear;
  subjects: CurriculumSubject[];
};

/**
 * Single curriculum for now (대한민국 교육과정). Kept as an id/name pair so a
 * second curriculum (e.g. 국제/검정고시) can be added as another top-level entry
 * later without reshaping callers.
 */
export const CURRICULUM_ID = "kr" as const;
export const CURRICULUM_NAME = "대한민국 교육과정" as const;

export const SCHOOL_LEVEL_LABEL: Record<SchoolLevel, string> = {
  ELEMENTARY: "초등학교",
  MIDDLE: "중학교",
  HIGH: "고등학교",
};

export const REVISION_YEAR_LABEL: Record<RevisionYear, string> = {
  2015: "2015 개정 교육과정",
  2022: "2022 개정 교육과정",
};

const MATH_ELEM_5: CurriculumUnit[] = [
  { id: "natural-mixed", name: "자연수의 혼합 계산" },
  { id: "factor-multiple", name: "약수와 배수" },
  { id: "rules-correspondence", name: "규칙과 대응" },
  { id: "fraction-add-sub", name: "약분과 통분" },
  { id: "fraction-mult", name: "분수의 곱셈" },
  { id: "congruence-symmetry", name: "합동과 대칭" },
  { id: "decimal-mult", name: "소수의 곱셈" },
  { id: "cuboid", name: "직육면체" },
  { id: "average-possibility", name: "평균과 가능성" },
];

const MATH_ELEM_6: CurriculumUnit[] = [
  { id: "fraction-div", name: "분수의 나눗셈" },
  { id: "decimal-div", name: "소수의 나눗셈" },
  { id: "ratio-rate", name: "비와 비율" },
  { id: "cuboid-volume", name: "직육면체의 부피와 겉넓이" },
  { id: "proportion", name: "비례식과 비례배분" },
  { id: "circle-area", name: "원의 넓이" },
  { id: "cylinder-cone", name: "원기둥, 원뿔, 구" },
];

const KOREAN_UNITS: CurriculumUnit[] = [
  { id: "reading", name: "읽기 (독해)" },
  { id: "writing", name: "쓰기 (작문)" },
  { id: "grammar", name: "문법" },
  { id: "literature", name: "문학" },
  { id: "vocabulary", name: "어휘" },
];

const ENGLISH_UNITS: CurriculumUnit[] = [
  { id: "vocabulary", name: "어휘" },
  { id: "grammar", name: "문법" },
  { id: "reading", name: "독해" },
  { id: "listening", name: "듣기" },
  { id: "writing", name: "영작" },
];

const SCIENCE_ELEM_UNITS: CurriculumUnit[] = [
  { id: "temperature-heat", name: "온도와 열" },
  { id: "solar-system", name: "태양계와 별" },
  { id: "solution", name: "용해와 용액" },
  { id: "multicultural-ecosystem", name: "생물과 환경" },
  { id: "weather", name: "날씨와 우리 생활" },
  { id: "object-motion", name: "물체의 운동" },
  { id: "acid-base", name: "산과 염기" },
];

const MATH_MIDDLE_1: CurriculumUnit[] = [
  // 2022 개정 중1 수학의 실제 1단원 — 기존 목록에서 누락돼 있던 것을 교재
  // 목차 교차 확인 후 추가함(2026-08-19). 소스: 천재교육 22개정 체크체크
  // 수학 중1-1 교재 목차 PDF.
  { id: "prime-factorization", name: "소인수분해" },
  { id: "int-rational", name: "정수와 유리수" },
  { id: "letters-expr", name: "문자와 식" },
  { id: "linear-eq", name: "일차방정식" },
  { id: "coordinate-graph", name: "좌표평면과 그래프" },
  { id: "basic-figure", name: "기본 도형" },
  { id: "plane-figure", name: "평면도형의 성질" },
  { id: "solid-figure", name: "입체도형의 성질" },
  { id: "statistics", name: "자료의 정리와 해석" },
];

const MATH_MIDDLE_2: CurriculumUnit[] = [
  { id: "rational-recurring", name: "유리수와 순환소수" },
  { id: "poly-calc", name: "식의 계산" },
  { id: "linear-ineq", name: "일차부등식" },
  { id: "simultaneous-eq", name: "연립일차방정식" },
  { id: "linear-function", name: "일차함수" },
  { id: "triangle-property", name: "삼각형의 성질" },
  { id: "quad-property", name: "사각형의 성질" },
  { id: "probability", name: "확률" },
];

const MATH_MIDDLE_3: CurriculumUnit[] = [
  { id: "square-root", name: "제곱근과 실수" },
  { id: "poly-factor", name: "다항식의 곱셈과 인수분해" },
  { id: "quadratic-eq", name: "이차방정식" },
  { id: "quadratic-function", name: "이차함수" },
  { id: "similarity", name: "도형의 닮음" },
  { id: "pythagoras", name: "피타고라스 정리" },
  { id: "trigonometry", name: "삼각비" },
  { id: "circle", name: "원의 성질" },
];

const MATH_HIGH_1: CurriculumUnit[] = [
  { id: "poly-op", name: "다항식" },
  { id: "equation-inequality", name: "방정식과 부등식" },
  { id: "coordinate-geometry", name: "도형의 방정식" },
  { id: "set-proposition", name: "집합과 명제" },
  { id: "function", name: "함수" },
  { id: "permutation-combination", name: "경우의 수" },
];

function grade(
  id: string,
  name: string,
  level: SchoolLevel,
  revisionYear: RevisionYear | undefined,
  subjects: CurriculumSubject[],
): CurriculumGrade {
  return { id, name, level, revisionYear, subjects };
}

/**
 * revisionYear values below reflect the OFFICIAL rollout schedule (source in
 * the RevisionYear doc comment) evaluated as of "today" in this codebase's
 * working context (2026-08-19, i.e. the 2026 school year). They describe
 * which revision's calendar window a grade falls into — they do NOT assert
 * that every unit listed below has been individually verified against that
 * revision's 각론 (subject-specific) document. 중3 is the one grade StudyOS
 * covers that is still on the 2015 개정 as of this date (its 2022 개정
 * changeover is 2027).
 */
export const CURRICULUM: CurriculumGrade[] = [
  grade("elem-5", "초등학교 5학년", "ELEMENTARY", 2022, [
    { id: "math", name: "수학", units: MATH_ELEM_5 },
    { id: "korean", name: "국어", units: KOREAN_UNITS },
    { id: "english", name: "영어", units: ENGLISH_UNITS },
    { id: "science", name: "과학", units: SCIENCE_ELEM_UNITS },
  ]),
  grade("elem-6", "초등학교 6학년", "ELEMENTARY", 2022, [
    { id: "math", name: "수학", units: MATH_ELEM_6 },
    { id: "korean", name: "국어", units: KOREAN_UNITS },
    { id: "english", name: "영어", units: ENGLISH_UNITS },
    { id: "science", name: "과학", units: SCIENCE_ELEM_UNITS },
  ]),
  grade("middle-1", "중학교 1학년", "MIDDLE", 2022, [
    { id: "math", name: "수학", units: MATH_MIDDLE_1 },
    { id: "korean", name: "국어", units: KOREAN_UNITS },
    { id: "english", name: "영어", units: ENGLISH_UNITS },
  ]),
  grade("middle-2", "중학교 2학년", "MIDDLE", 2022, [
    { id: "math", name: "수학", units: MATH_MIDDLE_2 },
    { id: "korean", name: "국어", units: KOREAN_UNITS },
    { id: "english", name: "영어", units: ENGLISH_UNITS },
  ]),
  grade("middle-3", "중학교 3학년", "MIDDLE", 2015, [
    { id: "math", name: "수학", units: MATH_MIDDLE_3 },
    { id: "korean", name: "국어", units: KOREAN_UNITS },
    { id: "english", name: "영어", units: ENGLISH_UNITS },
  ]),
  grade("high-1", "고등학교 1학년", "HIGH", 2022, [
    { id: "math", name: "수학", units: MATH_HIGH_1 },
    { id: "korean", name: "국어", units: KOREAN_UNITS },
    { id: "english", name: "영어", units: ENGLISH_UNITS },
  ]),
];
