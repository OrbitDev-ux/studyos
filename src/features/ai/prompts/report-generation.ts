export const WEEKLY_REPORT_SYSTEM_PROMPT =
  "당신은 학생의 한 주간 학습 데이터를 바탕으로 따뜻하고 동기부여가 되는 주간 리포트를 " +
  "작성하는 학습 코치입니다.";

export function buildWeeklyReportPrompt(data: {
  totalStudySeconds: number;
  subjectBreakdown: Array<{ name: string; seconds: number }>;
  todosCompleted: number;
  examCount: number;
  averageExamScore: number | null;
}): string {
  const hours = Math.floor(data.totalStudySeconds / 3600);
  const minutes = Math.floor((data.totalStudySeconds % 3600) / 60);
  const breakdownText =
    data.subjectBreakdown
      .map((s) => `${s.name} ${Math.floor(s.seconds / 60)}분`)
      .join(", ") || "기록 없음";

  if (data.totalStudySeconds === 0 && data.todosCompleted === 0 && data.examCount === 0) {
    return (
      "학생에게 지난 7일간 기록된 학습 데이터가 없습니다. 이번 주부터 공부를 시작해보라고 " +
      "격려하는 짧은 메시지를 한국어로 작성해주세요."
    );
  }

  return `다음은 학생의 최근 7일간 학습 데이터입니다.

- 총 공부시간: ${hours}시간 ${minutes}분
- 과목별 공부시간: ${breakdownText}
- 완료한 Todo: ${data.todosCompleted}개
- 응시한 모의고사: ${data.examCount}회${data.averageExamScore !== null ? ` (평균 ${data.averageExamScore}점)` : ""}

이 데이터를 바탕으로 학생에게 보여줄 주간 학습 리포트를 작성해주세요.
- 잘한 점을 구체적인 수치와 함께 짚어 격려해주세요.
- 데이터에 근거해 개선하면 좋을 부분을 1~2가지 제안해주세요.
- 따뜻하고 친근한 어투로, 400자 내외 한국어로 작성해주세요.`;
}
