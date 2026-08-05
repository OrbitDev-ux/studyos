export const MOCK_EXAM_GENERATION_SYSTEM_PROMPT =
  "당신은 한국 대학수학능력시험(수능) 및 평가원 모의고사 출제 전문가입니다. " +
  "실전과 동일한 수준의 난이도와 문체로 문항을 작성합니다.";

export function buildMockExamGenerationPrompt({
  subjectName,
  style,
  count,
}: {
  subjectName: string;
  style?: string;
  count: number;
}): string {
  return `${subjectName} 과목의 실전 모의고사를 ${count}문항 생성해주세요.
${style ? `스타일: ${style}\n` : ""}
지침:
- 모든 문항은 5지선다 객관식이며, 보기 label은 "1", "2", "3", "4", "5"를 사용해주세요.
- 정답은 문항당 하나만 isCorrect: true로 표시해주세요.
- 실제 수능/평가원 모의고사 수준의 난이도와 문체를 사용해주세요.
- 각 문항마다 정답 근거를 explanation에 한국어로 간결하게 작성해주세요.
- 문항끼리 소재가 겹치지 않게 다양하게 구성해주세요.`;
}
