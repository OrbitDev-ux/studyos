import { ANSWER_EXPLANATION_SYSTEM_PROMPT } from "@/features/ai/prompts/answer-explanation";
import { MOCK_EXAM_GENERATION_SYSTEM_PROMPT } from "@/features/ai/prompts/mock-exam-generation";
import { PROBLEM_GENERATION_SYSTEM_PROMPT } from "@/features/ai/prompts/problem-generation";
import { WEEKLY_REPORT_SYSTEM_PROMPT } from "@/features/ai/prompts/report-generation";
import { WEAKNESS_ANALYSIS_SYSTEM_PROMPT } from "@/features/ai/prompts/weakness-analysis";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/admin/settings";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type AiStatus = {
  enabled: boolean;
  model: string;
  apiKeyConfigured: boolean;
  usage: {
    problems: number;
    problemsWeek: number;
    mockExams: number;
    analyses: number;
    analysesWeek: number;
  };
};

export async function getAiStatus(): Promise<AiStatus> {
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const settings = await getAllSettings();

  const [problems, problemsWeek, mockExams, analyses, analysesWeek] = await Promise.all([
    prisma.problem.count(),
    prisma.problem.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.mockExam.count(),
    prisma.aiAnalysis.count(),
    prisma.aiAnalysis.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  return {
    enabled: settings.aiEnabled,
    model: settings.aiModel,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    usage: { problems, problemsWeek, mockExams, analyses, analysesWeek },
  };
}

// The live system prompts, surfaced read-only so an admin can review exactly
// what each AI feature instructs the model to do.
export const AI_PROMPTS = [
  { label: "문제 생성", prompt: PROBLEM_GENERATION_SYSTEM_PROMPT },
  { label: "정답 해설", prompt: ANSWER_EXPLANATION_SYSTEM_PROMPT },
  { label: "모의고사 생성", prompt: MOCK_EXAM_GENERATION_SYSTEM_PROMPT },
  { label: "취약점 분석", prompt: WEAKNESS_ANALYSIS_SYSTEM_PROMPT },
  { label: "주간 리포트", prompt: WEEKLY_REPORT_SYSTEM_PROMPT },
] as const;
