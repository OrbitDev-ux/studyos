import { WrongAnswerList } from "@/features/review/components/wrong-answer-list";
import { getWrongAnswers } from "@/features/review/queries";
import { AdSlot } from "@/features/ads/components/ad-slot";
import { accessStateFor, adsVisibleFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { requireCurrentUser } from "@/lib/session";

// requestAiExplanation's AI call regularly runs past Vercel's default
// serverless timeout — Server Actions inherit the invoking route's
// maxDuration.
export const maxDuration = 60;

export default async function ReviewPage() {
  const user = await requireCurrentUser();
  const wrongAnswers = await getWrongAnswers(user.id);
  const canUseDna = canUseFeature(accessStateFor(user), "WRONG_ANSWER_DNA");
  const showAds = adsVisibleFor(user);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">오답노트</h1>
      <AdSlot placement="review" show={showAds} />
      <WrongAnswerList wrongAnswers={wrongAnswers} canUseDna={canUseDna} />
    </div>
  );
}
