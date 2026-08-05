import type { Difficulty, QuestionType } from "@/generated/prisma/client";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/features/problems/constants";

export const PROBLEM_GENERATION_SYSTEM_PROMPT =
  "당신은 한국 고등학생을 위한 문제 출제 전문가입니다. 각 문제는 명확한 정답이 있어야 하며, " +
  "정답과 오답을 모두 자연스럽고 그럴듯하게 작성합니다.";

export function buildProblemGenerationPrompt({
  subjectName,
  unit,
  difficulty,
  type,
  count,
}: {
  subjectName: string;
  unit?: string;
  difficulty: Difficulty;
  type: QuestionType;
  count: number;
}): string {
  const unitLine = unit ? ` "${unit}" 단원` : "";

  const typeInstruction =
    type === "MULTIPLE_CHOICE"
      ? "객관식 문제로, 보기는 정확히 4개(A, B, C, D)를 만들고 그중 하나만 isCorrect: true로 표시해주세요."
      : "주관식 문제로, choices는 비워두고 answerText에 정답을 간결하게 적어주세요.";

  return `${subjectName} 과목${unitLine}에 대한 ${QUESTION_TYPE_LABEL[type]} 문제를 ${count}개 생성해주세요.

난이도: ${DIFFICULTY_LABEL[difficulty]}

지침:
- ${typeInstruction}
- 모든 문제에 왜 그 답이 맞는지 한국어로 설명(explanation)을 포함해주세요.
- 한국 고등학생 수준의 어휘와 배경지식을 기준으로 작성해주세요.
- 문제끼리 내용이 겹치지 않게 다양하게 만들어주세요.`;
}
