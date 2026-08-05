export const WEAKNESS_ANALYSIS_SYSTEM_PROMPT =
  "당신은 학생의 오답 데이터를 분석해 취약점을 짚어주는 학습 코치입니다. " +
  "주어진 데이터에 근거해서만 이야기하고, 근거 없는 일반론은 피합니다.";

export function buildWeaknessAnalysisPrompt(
  wrongAnswers: Array<{ subject: string; unit: string | null; prompt: string }>,
): string {
  if (wrongAnswers.length === 0) {
    return (
      "학생에게 아직 분석할 만큼의 오답 데이터가 없습니다. 오답노트를 계속 채워가면 " +
      "취약점을 분석해줄 수 있다고 격려하는 짧은 메시지를 한국어로 작성해주세요."
    );
  }

  const list = wrongAnswers
    .map((w, i) => `${i + 1}. [${w.subject}${w.unit ? ` · ${w.unit}` : ""}] ${w.prompt}`)
    .join("\n");

  return `다음은 학생이 최근에 틀린 문제 목록입니다.

${list}

이 데이터를 바탕으로:
- 어떤 과목/단원에 오답이 몰려 있는지 분석해주세요.
- 반복적으로 나타나는 취약 패턴이 있다면 짚어주세요.
- 앞으로 무엇을 우선적으로 복습하면 좋을지 구체적으로 제안해주세요.

데이터에 없는 내용은 추측하지 말고, 500자 내외로 간결하게 한국어로 작성해주세요.`;
}
