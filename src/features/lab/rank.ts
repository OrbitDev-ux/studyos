/**
 * Pure, deterministic "다음 학습 추천" ranking — no AI, no server imports, so it is
 * unit-testable. Priority: 1) 복습 예정(망각 곡선) 2) 취약 단원(정답률 낮은 순)
 * 3) 최근 학습 이어가기.
 */

export type NextLearningItem = {
  title: string;
  reason: string;
  href: string;
  kind: "review" | "weakness" | "continue";
};

export type RankInput = {
  dueReviewCount: number;
  weak: { subjectName: string; unit: string; accuracyPercent: number; band: string }[];
  recentSubjects: string[];
};

export function rankNextLearning(input: RankInput): NextLearningItem[] {
  const items: NextLearningItem[] = [];

  if (input.dueReviewCount > 0) {
    items.push({
      title: `복습 대기 ${input.dueReviewCount}개 먼저 풀기`,
      reason: "기억이 사라지기 전에 복습하면 가장 효율적이에요.",
      href: "/review",
      kind: "review",
    });
  }

  for (const w of input.weak.slice(0, 3)) {
    items.push({
      title: `${w.subjectName} · ${w.unit} 보완하기`,
      reason: `정답률 ${w.accuracyPercent}% — 이 단원을 집중 연습하면 점수가 오릅니다.`,
      href: "/problems",
      kind: "weakness",
    });
  }

  if (items.length < 3 && input.recentSubjects.length > 0) {
    const subject = input.recentSubjects[0]!;
    items.push({
      title: `${subject} 학습 이어가기`,
      reason: "최근 학습 흐름을 이어가 연속 기록을 유지하세요.",
      href: "/problems",
      kind: "continue",
    });
  }

  return items;
}
