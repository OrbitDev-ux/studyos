import { ANSWER_EXPLANATION_SYSTEM_PROMPT } from "@/features/ai/prompts/answer-explanation";
import { MOCK_EXAM_GENERATION_SYSTEM_PROMPT } from "@/features/ai/prompts/mock-exam-generation";
import { PROBLEM_GENERATION_SYSTEM_PROMPT } from "@/features/ai/prompts/problem-generation";
import { WEEKLY_REPORT_SYSTEM_PROMPT } from "@/features/ai/prompts/report-generation";
import { WEAKNESS_ANALYSIS_SYSTEM_PROMPT } from "@/features/ai/prompts/weakness-analysis";
import { WRONG_ANSWER_DNA_SYSTEM_PROMPT } from "@/features/ai/prompts/wrong-answer-dna";

// The single source of truth for which prompts exist. Each entry defines a
// built-in prompt type, its human labels, and the default content used to
// (a) seed the DB the first time and (b) fall back safely if the DB row is
// missing or disabled. Add a new AI prompt type by adding one entry here —
// nothing else in the engine needs to change.

export const PROMPT_TYPES = {
  PROBLEM_GENERATION: "problem_generation",
  ANSWER_EXPLANATION: "answer_explanation",
  MOCK_EXAM_GENERATION: "mock_exam_generation",
  WEAKNESS_ANALYSIS: "weakness_analysis",
  WEEKLY_REPORT: "weekly_report",
  WRONG_ANSWER_DNA: "wrong_answer_dna",
} as const;

export type PromptType = (typeof PROMPT_TYPES)[keyof typeof PROMPT_TYPES];

export type PromptDefinition = {
  type: string;
  title: string;
  description: string;
  defaultContent: string;
};

export const PROMPT_REGISTRY: PromptDefinition[] = [
  {
    type: PROMPT_TYPES.PROBLEM_GENERATION,
    title: "문제 생성",
    description: "과목·단원·난이도에 맞춰 문제를 생성하는 시스템 프롬프트.",
    defaultContent: PROBLEM_GENERATION_SYSTEM_PROMPT,
  },
  {
    type: PROMPT_TYPES.ANSWER_EXPLANATION,
    title: "정답 해설",
    description: "틀린 문제에 대한 해설을 생성하는 시스템 프롬프트.",
    defaultContent: ANSWER_EXPLANATION_SYSTEM_PROMPT,
  },
  {
    type: PROMPT_TYPES.MOCK_EXAM_GENERATION,
    title: "모의고사 생성",
    description: "모의고사 문항 세트를 생성하는 시스템 프롬프트.",
    defaultContent: MOCK_EXAM_GENERATION_SYSTEM_PROMPT,
  },
  {
    type: PROMPT_TYPES.WEAKNESS_ANALYSIS,
    title: "취약점 분석",
    description: "오답 데이터로 취약 단원을 분석하는 시스템 프롬프트.",
    defaultContent: WEAKNESS_ANALYSIS_SYSTEM_PROMPT,
  },
  {
    type: PROMPT_TYPES.WRONG_ANSWER_DNA,
    title: "오답 DNA 분석",
    description: "문제·학생 답·정답으로 오답의 근본 원인 유형을 진단하는 시스템 프롬프트.",
    defaultContent: WRONG_ANSWER_DNA_SYSTEM_PROMPT,
  },
  {
    type: PROMPT_TYPES.WEEKLY_REPORT,
    title: "주간 리포트",
    description: "학습 데이터로 주간 리포트를 생성하는 시스템 프롬프트.",
    defaultContent: WEEKLY_REPORT_SYSTEM_PROMPT,
  },
];

export const PROMPT_DEFINITIONS: Record<string, PromptDefinition> = Object.fromEntries(
  PROMPT_REGISTRY.map((definition) => [definition.type, definition]),
);

export function getPromptDefinition(type: string): PromptDefinition | undefined {
  return PROMPT_DEFINITIONS[type];
}
