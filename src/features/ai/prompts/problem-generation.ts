import type { Difficulty, QuestionType } from "@/generated/prisma/client";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/features/problems/constants";

export const PROBLEM_GENERATION_SYSTEM_PROMPT =
  "당신은 한국 초·중·고 학생을 위한 문제 출제 전문가입니다. 각 문제는 명확한 정답이 있어야 하며, " +
  "정답과 오답을 모두 자연스럽고 그럴듯하게 작성합니다.";

/**
 * Shared across every generator (problem set, similar-problem, mock exam):
 * a question stem that says "다음 글을 읽고" / "다음 문단의 ~" / "다음 대화를
 * 보고" etc. is worthless without the referenced passage actually being part
 * of the generated text — there is no separate passage/stem field in the
 * schema (see features/problems/schema.ts), so it has to live inside
 * `prompt` itself. Without this instruction the model sometimes writes a
 * question that assumes a passage exists without ever generating it (real
 * example pulled from the DB: "다음 문단의 마지막 문장으로 가장 적절한
 * 것은?" followed directly by four answer choices — no paragraph).
 */
export const PASSAGE_COMPLETENESS_INSTRUCTION =
  "문제가 '다음 글을 읽고', '다음 문단의 ~', '다음 대화를 보고'처럼 특정 지문·문단·자료를 전제로 한다면, 그 지문·문단·대화 전체를 prompt 안에 반드시 포함하세요. 지문 없이 질문만 던지지 마세요.";

/**
 * Per-type generation instruction, shared by every generator (problem set, study
 * book, etc.) so all features produce the same shape for each QuestionType.
 * ESSAY explicitly must NOT be a choice/short-answer item.
 */
export function questionTypeInstruction(type: QuestionType): string {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return "객관식 문제로, 보기(choices)는 정확히 4개(A, B, C, D)를 만들고 그중 하나만 isCorrect: true로 표시하세요. answerText와 scoringCriteria는 비워두세요.";
    case "SHORT_ANSWER":
      return "단답형 문제로, choices는 비워두고 answerText에 정답을 간결하게 적으세요. scoringCriteria는 비워두세요.";
    case "ESSAY":
      return (
        "서술형 문제로, 학생이 풀이 과정·계산 과정·근거·개념 설명·비교/분석 중 하나 이상을 자신의 말로 서술하도록 요구하세요. " +
        "choices는 비워두고, answerText에는 '모범 답안'(문장형 예시 답안)을, scoringCriteria에는 '핵심 채점 요소'(부분 점수 기준 포함, 줄바꿈으로 구분)를 작성하세요. " +
        "단순히 정답만 짧게 쓰는 문제나 객관식으로 만들지 마세요."
      );
  }
}

export function buildProblemGenerationPrompt({
  subjectName,
  unit,
  difficulty,
  type,
  count,
  gradeName,
}: {
  subjectName: string;
  unit?: string;
  difficulty: Difficulty;
  type: QuestionType;
  count: number;
  /**
   * e.g. "중학교 1학년". Only the direct problem-generation flow has this
   * (features/curriculum/taxonomy.ts resolves it from the user's grade
   * selection) — similar-problem regeneration, study-book items, and the
   * admin prompt test panel don't track a grade against a problem, so this
   * stays optional and falls back to the previous, grade-neutral wording
   * rather than changing behavior for those callers.
   */
  gradeName?: string;
}): string {
  const unitLine = unit ? ` "${unit}" 단원` : "";

  const typeInstruction = questionTypeInstruction(type);
  const levelLine = gradeName
    ? `- ${gradeName} 학생 수준의 어휘와 배경지식을 기준으로 작성해주세요.`
    : "- 한국 고등학생 수준의 어휘와 배경지식을 기준으로 작성해주세요.";

  return `${subjectName} 과목${unitLine}에 대한 ${QUESTION_TYPE_LABEL[type]} 문제를 ${count}개 생성해주세요.

난이도: ${DIFFICULTY_LABEL[difficulty]}

지침:
- ${typeInstruction}
- 모든 문제에 왜 그 답이 맞는지 한국어로 설명(explanation)을 포함해주세요.
${levelLine}
- 문제끼리 내용이 겹치지 않게 다양하게 만들어주세요.
- ${PASSAGE_COMPLETENESS_INSTRUCTION}`;
}

/**
 * Generate one fresh problem that exercises the same skill as an existing
 * problem without copying its wording, answer, or distractors.
 */
export function buildSimilarProblemPrompt({
  subjectName,
  unit,
  difficulty,
  type,
  originalPrompt,
}: {
  subjectName: string;
  unit?: string | null;
  difficulty: Difficulty;
  type: QuestionType;
  originalPrompt: string;
}): string {
  const unitLine = unit ? ` "${unit}" 단원` : "";
  const typeInstruction = questionTypeInstruction(type);

  return `${subjectName} 과목${unitLine}의 기존 문제와 같은 핵심 개념·풀이 능력을 평가하는 새로운 ${QUESTION_TYPE_LABEL[type]} 문제 1개를 생성해주세요.

기존 문제:
---
${originalPrompt}
---

난이도: ${DIFFICULTY_LABEL[difficulty]}

지침:
- 기존 문제의 문장, 숫자, 보기, 정답을 그대로 복사하지 말고 상황이나 수치를 바꾸세요.
- 기존 문제를 풀지 않아도 독립적으로 이해할 수 있어야 합니다.
- ${typeInstruction}
- 왜 그 답이 맞는지 한국어로 설명(explanation)을 포함해주세요.
- ${PASSAGE_COMPLETENESS_INSTRUCTION}
- 결과는 문제 1개만 반환하세요.`;
}
