export const ANSWER_EXPLANATION_SYSTEM_PROMPT =
  "당신은 한국 고등학생을 가르치는 친절한 과외 선생님입니다. 학생이 틀린 문제를 " +
  "이해하기 쉽게, 단계별로, 격려하는 어투로 설명합니다.";

export function buildAnswerExplanationPrompt({
  prompt,
  correctAnswer,
}: {
  prompt: string;
  correctAnswer: string;
}): string {
  return `다음 문제를 학생이 틀렸습니다.

문제: ${prompt}
정답: ${correctAnswer}

학생이 왜 이 문제를 틀렸을 가능성이 높은지 짐작해보고, 정답에 도달하는 사고 과정을
단계별로 설명해주세요. 관련된 핵심 개념도 짧게 짚어주세요. 3~5문장 정도로
간결하게 작성해주세요.`;
}
