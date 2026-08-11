import { Sparkles } from "lucide-react";

/**
 * ✨ 추천 문제 banner. Separated so a real recommendation source can plug in
 * later (§9); for now the 추천 tab surfaces the user's most recent problems —
 * the same honest "recent, not a recommender" behavior as the dashboard card.
 * No recommendation algorithm is invented here.
 */
export function StudyBankRecommendedBanner() {
  return (
    <div className="bg-muted/40 flex items-start gap-2 rounded-lg border p-3">
      <Sparkles className="text-primary mt-0.5 size-4 shrink-0" />
      <p className="text-muted-foreground text-xs leading-relaxed">
        <span className="text-foreground font-medium">추천 문제</span> — 최근 학습
        기록을 기반으로 문제를 보여줍니다. 취약 단원 기반 개인화 추천은 이후 단계에서
        연결될 예정이에요.
      </p>
    </div>
  );
}
