export const WRONG_ANSWER_DNA_SYSTEM_PROMPT =
  "당신은 한국 학생의 오답을 진단하는 학습 분석 전문가입니다. 문제, 학생의 답, " +
  "정답을 보고 학생이 '왜' 틀렸는지 오답의 근본 원인을 한 가지 유형으로 분류하고, " +
  "관련 핵심 개념과 구체적인 이유를 진단합니다. 반드시 지정된 JSON 형식으로만 " +
  "응답하며, type 은 주어진 목록 중 하나여야 합니다.";

/**
 * Provides the AI everything needed to classify an error: the full problem, the
 * student's actual answer, the correct answer, and the concept/unit. The
 * allowed `type` values mirror ERROR_TYPES in features/review/dna.ts.
 */
export function buildWrongAnswerDnaPrompt({
  prompt,
  userAnswer,
  correctAnswer,
  subject,
  unit,
}: {
  prompt: string;
  userAnswer: string | null;
  correctAnswer: string;
  subject: string;
  unit: string | null;
}): string {
  return `다음은 학생이 틀린 문제입니다.

과목: ${subject}
단원: ${unit ?? "미지정"}
문제: ${prompt}
학생의 답: ${userAnswer ?? "(기록 없음)"}
정답: ${correctAnswer}

학생이 이 문제를 틀린 근본 원인을 아래 유형 중 하나로 분류하세요.
- CALCULATION_ERROR: 계산 과정의 실수
- CONCEPT_ERROR: 개념 자체를 이해하지 못함
- READING_ERROR: 문제/조건을 잘못 읽거나 이해함
- FORMULA_ERROR: 공식을 잘못 적용하거나 잘못 앎
- CARELESS_ERROR: 개념은 알지만 부주의로 인한 실수
- UNKNOWN: 판단 근거가 부족함

JSON 형식:
{ "type": "<위 유형 중 하나>", "concept": "<관련 핵심 개념>", "reason": "<한두 문장으로 된 구체적인 진단>" }`;
}
