import type { MissionBoard } from "@/features/learning/mission";
import type { WeaknessUnit } from "@/features/learning/weakness-compute";

/**
 * Public Demo Mode — fully static, self-contained dataset. NONE of this touches
 * the database, real users, or the AI: it is the "Demo Data Adapter" that feeds
 * the SAME presentational components the real app uses. There is no demo user in
 * the DB, no ProblemAttempt/WrongAnswer/Review rows, and no Gemini call anywhere
 * in the demo. Interactivity (solving, EXP, mission progress) lives only in
 * client state (see features/demo/state.tsx).
 *
 * The fixed demo student and subjects mirror the curriculum taxonomy
 * (features/curriculum) so the demo is internally consistent with the real app.
 */

export const DEMO_STUDENT = {
  name: "김민준",
  grade: "초등학교 5학년",
  level: 12,
  exp: 2840,
  /** EXP needed to reach the next level (for the progress bar). */
  expForNextLevel: 3200,
  streakDays: 18,
  totalProblems: 427,
  accuracyPercent: 82,
  weeklyStudyMinutes: 272, // 4시간 32분
  friendCount: 8,
} as const;

/** EXP awarded per solved problem in the demo (client-side only). */
export const DEMO_EXP_PER_SOLVE = 20;

// ─── Weakness (취약 개념) ────────────────────────────────────────────────────
export const DEMO_WEAKNESS_UNITS: WeaknessUnit[] = [
  {
    subjectId: "demo-math",
    subjectName: "수학",
    unit: "분수의 곱셈",
    attempts: 14,
    correct: 8,
    overallAccuracy: 57,
    mastery: 61,
    band: "ORANGE",
    recentWrongStreak: 2,
    avgDurationMs: 48000,
    lastAttemptAt: new Date("2026-08-07T10:00:00Z"),
  },
  {
    subjectId: "demo-math",
    subjectName: "수학",
    unit: "소수의 곱셈",
    attempts: 11,
    correct: 7,
    overallAccuracy: 64,
    mastery: 68,
    band: "ORANGE",
    recentWrongStreak: 1,
    avgDurationMs: 52000,
    lastAttemptAt: new Date("2026-08-06T10:00:00Z"),
  },
  {
    subjectId: "demo-science",
    subjectName: "과학",
    unit: "용해와 용액",
    attempts: 9,
    correct: 6,
    overallAccuracy: 67,
    mastery: 74,
    band: "ORANGE",
    recentWrongStreak: 0,
    avgDurationMs: 61000,
    lastAttemptAt: new Date("2026-08-05T10:00:00Z"),
  },
];

// ─── Daily Mission ───────────────────────────────────────────────────────────
// Real MissionBoard shape so the actual DailyMissionCard renders it unchanged.
// hrefs point at /demo/problems (the card reads href from data).
export const DEMO_MISSION_BOARD: MissionBoard = {
  missions: [
    {
      id: "REVIEW_DUE",
      type: "REVIEW_DUE",
      title: "오늘 복습",
      subjectId: null,
      subjectName: null,
      unit: null,
      target: 5,
      done: 3,
      completed: false,
      estimatedMinutes: 10,
      href: "/demo/problems",
    },
    {
      id: "REPEATED_WRONG:demo-math",
      type: "REPEATED_WRONG",
      title: "수학 · 분수의 곱셈 취약 문제",
      subjectId: "demo-math",
      subjectName: "수학",
      unit: "분수의 곱셈",
      target: 5,
      done: 2,
      completed: false,
      estimatedMinutes: 10,
      href: "/demo/problems",
    },
    {
      id: "LOW_MASTERY:demo-science",
      type: "LOW_MASTERY",
      title: "과학 · 용해와 용액 집중 연습",
      subjectId: "demo-science",
      subjectName: "과학",
      unit: "용해와 용액",
      target: 3,
      done: 3,
      completed: true,
      estimatedMinutes: 6,
      href: "/demo/problems",
    },
  ],
  totalTarget: 13,
  totalDone: 8,
  progressPercent: 62,
  estimatedMinutes: 26,
  hasData: true,
};

// ─── Solvable demo problems ──────────────────────────────────────────────────
export type DemoChoice = { label: string; content: string };
export type DemoProblem = {
  id: string;
  subject: string;
  unit: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  prompt: string;
  choices?: DemoChoice[];
  /** For MC: the correct choice label; for SHORT_ANSWER: the accepted answer. */
  answer: string;
  explanation: string;
  reason: string;
};

export const DEMO_PROBLEMS: DemoProblem[] = [
  {
    id: "demo-p1",
    subject: "수학",
    unit: "분수의 곱셈",
    difficulty: "MEDIUM",
    type: "SHORT_ANSWER",
    prompt: "다음 계산을 하세요.\n\n3/4 × 2/5 = ?",
    answer: "3/10",
    explanation:
      "분수의 곱셈은 분자끼리, 분모끼리 곱합니다. 3×2 = 6, 4×5 = 20 이므로 6/20 이고, 약분하면 3/10 입니다.",
    reason: "분자와 분모를 각각 곱한 뒤 약분하는 과정을 기억하세요.",
  },
  {
    id: "demo-p2",
    subject: "수학",
    unit: "분수의 곱셈",
    difficulty: "EASY",
    type: "MULTIPLE_CHOICE",
    prompt: "2/3 × 3 의 값으로 옳은 것은?",
    choices: [
      { label: "A", content: "2" },
      { label: "B", content: "3" },
      { label: "C", content: "6" },
      { label: "D", content: "2/9" },
    ],
    answer: "A",
    explanation: "2/3 × 3 = 2/3 × 3/1 = 6/3 = 2 입니다.",
    reason: "자연수는 분모가 1인 분수로 바꿔 곱합니다.",
  },
  {
    id: "demo-p3",
    subject: "과학",
    unit: "용해와 용액",
    difficulty: "MEDIUM",
    type: "MULTIPLE_CHOICE",
    prompt: "설탕이 물에 녹아 설탕물이 될 때, 물처럼 다른 물질을 녹이는 물질을 무엇이라고 하나요?",
    choices: [
      { label: "A", content: "용질" },
      { label: "B", content: "용매" },
      { label: "C", content: "용액" },
      { label: "D", content: "혼합물" },
    ],
    answer: "B",
    explanation:
      "다른 물질을 녹이는 물질을 용매, 녹는 물질을 용질, 둘이 고르게 섞인 것을 용액이라고 합니다.",
    reason: "용매·용질·용액의 정의를 구분해 기억하세요.",
  },
];

// ─── Wrong-answer notebook + 오답 DNA ────────────────────────────────────────
export type DemoErrorType =
  | "CALCULATION_ERROR"
  | "CONCEPT_ERROR"
  | "READING_ERROR"
  | "FORMULA_ERROR"
  | "CARELESS_ERROR";

export type DemoWrongAnswer = {
  id: string;
  subject: string;
  unit: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  myAnswer: string;
  correctAnswer: string;
  explanation: string;
  dna: { type: DemoErrorType; concept: string; reason: string };
};

export const DEMO_WRONG_ANSWERS: DemoWrongAnswer[] = [
  {
    id: "demo-w1",
    subject: "수학",
    unit: "분수의 곱셈",
    difficulty: "MEDIUM",
    prompt: "3/4 × 2/5 = ?",
    myAnswer: "6/9",
    correctAnswer: "3/10",
    explanation: "분자끼리(3×2=6), 분모끼리(4×5=20) 곱해 6/20, 약분하면 3/10.",
    dna: {
      type: "CALCULATION_ERROR",
      concept: "분수의 곱셈",
      reason: "분모를 곱하지 않고 더해서 9로 계산했습니다. 분모끼리 곱해야 합니다.",
    },
  },
  {
    id: "demo-w2",
    subject: "수학",
    unit: "소수의 나눗셈",
    difficulty: "HARD",
    prompt: "4.8 ÷ 0.6 = ?",
    myAnswer: "0.8",
    correctAnswer: "8",
    explanation: "0.6으로 나눌 때 나누는 수와 나누어지는 수에 10을 곱해 48 ÷ 6 = 8.",
    dna: {
      type: "CONCEPT_ERROR",
      concept: "소수의 나눗셈",
      reason: "소수점을 옮기는 규칙을 적용하지 않아 자릿수를 잘못 맞췄습니다.",
    },
  },
  {
    id: "demo-w3",
    subject: "과학",
    unit: "용해와 용액",
    difficulty: "MEDIUM",
    prompt: "물에 녹는 물질을 무엇이라고 하는가?",
    myAnswer: "용매",
    correctAnswer: "용질",
    explanation: "녹는 물질은 용질, 녹이는 물질은 용매입니다.",
    dna: {
      type: "READING_ERROR",
      concept: "용해와 용액",
      reason: "용매와 용질의 정의를 반대로 이해했습니다. 개념의 방향을 구분하세요.",
    },
  },
];

export const DEMO_ERROR_TYPE_LABEL: Record<DemoErrorType, string> = {
  CALCULATION_ERROR: "계산 실수",
  CONCEPT_ERROR: "개념 오류",
  READING_ERROR: "문제 이해 오류",
  FORMULA_ERROR: "공식 오류",
  CARELESS_ERROR: "단순 실수",
};

// ─── Review schedule (자동 복습) ─────────────────────────────────────────────
export const DEMO_REVIEW_SCHEDULE = [
  { label: "오늘 복습", count: 3, when: "now" },
  { label: "내일", count: 2, when: "1d" },
  { label: "3일 후", count: 4, when: "3d" },
] as const;

// ─── Weak problems (오늘의 약점 문제) ────────────────────────────────────────
export type DemoWeakProblem = {
  problemId: string;
  unit: string;
  subject: string;
  masteryPercent: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  reason: string;
  category: "REVIEW_DUE" | "REPEATED_WRONG" | "LOW_MASTERY";
};

export const DEMO_WEAK_PROBLEMS: DemoWeakProblem[] = [
  {
    problemId: "demo-p1",
    unit: "분수의 곱셈",
    subject: "수학",
    masteryPercent: 61,
    difficulty: "MEDIUM",
    reason: "최근 분수의 곱셈 문제를 자주 틀려서 추천했어요.",
    category: "REPEATED_WRONG",
  },
  {
    problemId: "demo-p2",
    unit: "소수의 곱셈",
    subject: "수학",
    masteryPercent: 68,
    difficulty: "EASY",
    reason: "소수의 곱셈 정답률이 낮아 집중 연습이 필요해요.",
    category: "LOW_MASTERY",
  },
  {
    problemId: "demo-p3",
    unit: "용해와 용액",
    subject: "과학",
    masteryPercent: 74,
    difficulty: "MEDIUM",
    reason: "용해와 용액 복습할 시점이에요.",
    category: "REVIEW_DUE",
  },
];

// ─── AI recommendation (mock — no Gemini) ────────────────────────────────────
export const DEMO_AI_RECOMMENDATION = {
  summary:
    "현재 가장 먼저 복습하면 좋은 영역은 '분수의 곱셈'입니다. 최근 오답률이 높고, 최근 풀이에서 분모를 잘못 계산하는 같은 실수가 반복되고 있습니다.",
  order: ["분수의 곱셈 복습", "약점 문제 3개", "3일 후 재복습"],
} as const;

// ─── AI Tutor (mock — no Gemini) ─────────────────────────────────────────────
export const DEMO_TUTOR = {
  problem: "3/4 × 2/5 = ? 이 문제가 어려워요.",
  steps: [
    {
      id: "hint",
      label: "힌트",
      title: "💡 힌트",
      body: "분수의 곱셈은 '분자끼리, 분모끼리' 곱하면 돼요. 두 분수의 분자와 분모를 각각 살펴보세요.",
    },
    {
      id: "approach",
      label: "풀이 방향",
      title: "🧭 풀이 방향",
      body: "1) 분자끼리 곱해요: 3 × 2\n2) 분모끼리 곱해요: 4 × 5\n3) 나온 분수를 약분해요.",
    },
    {
      id: "full",
      label: "상세 풀이",
      title: "📝 상세 풀이",
      body: "3/4 × 2/5 = (3×2)/(4×5) = 6/20\n6과 20을 2로 약분하면 = 3/10\n따라서 정답은 3/10 입니다.",
    },
  ],
} as const;

// ─── Mock exam (모의고사) ────────────────────────────────────────────────────
export const DEMO_EXAM = {
  title: "5학년 수학 미니 모의고사",
  timeLimitMinutes: 10,
  questions: [
    {
      id: "e1",
      prompt: "2/3 × 3/4 = ?",
      choices: [
        { label: "A", content: "1/2" },
        { label: "B", content: "6/7" },
        { label: "C", content: "5/12" },
        { label: "D", content: "6/12" },
      ],
      answer: "A",
    },
    {
      id: "e2",
      prompt: "0.5 × 0.4 = ?",
      choices: [
        { label: "A", content: "0.9" },
        { label: "B", content: "0.2" },
        { label: "C", content: "2.0" },
        { label: "D", content: "0.02" },
      ],
      answer: "B",
    },
    {
      id: "e3",
      prompt: "1/2 × 6 = ?",
      choices: [
        { label: "A", content: "2" },
        { label: "B", content: "3" },
        { label: "C", content: "6" },
        { label: "D", content: "12" },
      ],
      answer: "B",
    },
    {
      id: "e4",
      prompt: "3.6 ÷ 0.9 = ?",
      choices: [
        { label: "A", content: "4" },
        { label: "B", content: "0.4" },
        { label: "C", content: "40" },
        { label: "D", content: "3.24" },
      ],
      answer: "A",
    },
    {
      id: "e5",
      prompt: "정삼각형의 세 각의 크기의 합은?",
      choices: [
        { label: "A", content: "90도" },
        { label: "B", content: "180도" },
        { label: "C", content: "270도" },
        { label: "D", content: "360도" },
      ],
      answer: "B",
    },
  ],
} as const;

// ─── Recent activity (최근 학습) ─────────────────────────────────────────────
export const DEMO_RECENT_ACTIVITY = [
  { id: "a1", label: "분수의 곱셈 5문제", detail: "정답 3 · 오답 2", when: "오늘" },
  { id: "a2", label: "용해와 용액 3문제", detail: "정답 3", when: "오늘" },
  { id: "a3", label: "5학년 수학 미니 모의고사", detail: "80점", when: "어제" },
  { id: "a4", label: "소수의 나눗셈 4문제", detail: "정답 2 · 오답 2", when: "2일 전" },
] as const;

// ─── Weekly study chart (통계) ───────────────────────────────────────────────
export const DEMO_WEEKLY_STUDY = [
  { day: "월", minutes: 45 },
  { day: "화", minutes: 30 },
  { day: "수", minutes: 52 },
  { day: "목", minutes: 20 },
  { day: "금", minutes: 40 },
  { day: "토", minutes: 60 },
  { day: "일", minutes: 25 },
] as const;

// ─── Friends (mock — never real users) ───────────────────────────────────────
export const DEMO_FRIENDS = [
  { id: "f1", name: "이서연", level: 14, status: "온라인" },
  { id: "f2", name: "박도윤", level: 11, status: "오프라인" },
  { id: "f3", name: "최지우", level: 15, status: "온라인" },
  { id: "f4", name: "정하준", level: 9, status: "오프라인" },
] as const;
