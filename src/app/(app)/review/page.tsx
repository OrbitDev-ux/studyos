import Link from "next/link";
import { Dna } from "lucide-react";
import { WrongAnswerList } from "@/features/review/components/wrong-answer-list";
import { getWrongAnswers } from "@/features/review/queries";
import { AdSlot } from "@/features/ads/components/ad-slot";
import { accessStateFor, adsVisibleFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
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
  const t = getMessages(await getServerLocale(user.locale)).review;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      {/* 차별점 연결 서사 — 오답이 어떻게 다음 학습으로 이어지는지 보여준다. */}
      <div className="border-info/20 bg-info/8 flex items-start gap-3 rounded-xl border p-3.5">
        <span className="bg-info/12 text-info flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Dna className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{t.heroTitle}</p>
          <p className="text-muted-foreground text-xs">
            {t.heroPrefix}
            <Link href="/stats" className="text-info font-medium hover:underline">
              {t.heroLink}
            </Link>
            {t.heroSuffix}
          </p>
        </div>
      </div>

      <AdSlot placement="review" show={showAds} />
      <WrongAnswerList wrongAnswers={wrongAnswers} canUseDna={canUseDna} />
    </div>
  );
}
