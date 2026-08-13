"use server";

import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getLabFeature } from "@/features/lab/registry";
import { bumpLabCounter, isLabFeatureEnabled } from "@/features/lab/state";
import { runLearningCoach, type CoachResult } from "@/features/lab/coach";
import { getNextLearning, type NextLearningItem } from "@/features/lab/next-learning";
import { getStudyBook } from "@/features/study-books/queries";
import { addWeaknessProblem } from "@/features/study-books/item-actions";

/** Server-side gate: feature exists, is public, and is admin-enabled. */
async function assertRunnable(key: string): Promise<string | null> {
  const feature = getLabFeature(key);
  if (!feature) return "존재하지 않는 실험 기능입니다.";
  if (feature.visibility !== "public") return "접근 권한이 없습니다.";
  if (!(await isLabFeatureEnabled(key))) return "현재 비활성화된 실험 기능이에요.";
  return null;
}

export type CoachRunResult = {
  coach?: CoachResult;
  empty?: boolean;
  error?: string;
  code?: string;
  upgradePlan?: string | null;
};

/** 🧠 AI 학습 코치 — reuses the AI usage/entitlement guard inside runLearningCoach. */
export async function runCoach(): Promise<CoachRunResult> {
  const user = await requireCurrentUser();
  const blocked = await assertRunnable("AI_LEARNING_COACH");
  if (blocked) return { error: blocked };

  await bumpLabCounter("AI_LEARNING_COACH", "uses");
  const res = await runLearningCoach(user);
  if (res.ok) {
    await bumpLabCounter("AI_LEARNING_COACH", "successes");
    return { coach: res.result };
  }
  await bumpLabCounter("AI_LEARNING_COACH", "failures");
  if ("empty" in res) return { empty: true };
  return {
    error: "error" in res ? res.error : "학습 코치 분석에 실패했어요.",
    code: "code" in res ? res.code : undefined,
    upgradePlan: "upgradePlan" in res ? res.upgradePlan : undefined,
  };
}

export type NextLearningRunResult = {
  items?: NextLearningItem[];
  empty?: boolean;
  error?: string;
};

/** 🎯 다음 학습 추천 — deterministic reuse of Learning-OS data (no AI). */
export async function runNextLearning(): Promise<NextLearningRunResult> {
  const user = await requireCurrentUser();
  const blocked = await assertRunnable("NEXT_LEARNING_RECOMMENDATION");
  if (blocked) return { error: blocked };

  await bumpLabCounter("NEXT_LEARNING_RECOMMENDATION", "uses");
  const res = await getNextLearning(user.id);
  await bumpLabCounter("NEXT_LEARNING_RECOMMENDATION", "successes");
  return { items: res.items, empty: res.empty };
}

export type AutoBookRunResult = {
  ok?: true;
  chapterTitle?: string;
  bookId?: string;
  error?: string;
  code?: string;
};

/** 📘 자동 교재 보강 — reuses addWeaknessProblem (AI gen + guard + rollback). */
export async function runAutoBookEnhancement(bookId: string): Promise<AutoBookRunResult> {
  const user = await requireCurrentUser();
  const blocked = await assertRunnable("AUTO_BOOK_ENHANCEMENT");
  if (blocked) return { error: blocked };

  // Owner-scoped: another user's bookId returns null.
  const book = await getStudyBook(bookId, user.id);
  if (!book) return { error: "교재를 찾을 수 없습니다." };
  const chapter = book.chapters[0];
  if (!chapter) return { error: "보강할 챕터가 없어요." };

  await bumpLabCounter("AUTO_BOOK_ENHANCEMENT", "uses");
  try {
    const result = await addWeaknessProblem(bookId, chapter.id);
    if (result.ok) {
      await bumpLabCounter("AUTO_BOOK_ENHANCEMENT", "successes");
      return { ok: true, bookId, chapterTitle: chapter.title };
    }
    await bumpLabCounter("AUTO_BOOK_ENHANCEMENT", "failures");
    return { error: result.error ?? "보강에 실패했어요.", code: result.code };
  } catch {
    await bumpLabCounter("AUTO_BOOK_ENHANCEMENT", "failures");
    return { error: "보강에 실패했어요. 잠시 후 다시 시도해주세요." };
  }
}

/** 👍/👎 — one vote per user per feature (upsert handles duplicate submission). */
export async function submitLabVote(
  featureKey: string,
  vote: "LIKE" | "DISLIKE",
): Promise<{ ok?: true; vote?: "LIKE" | "DISLIKE"; error?: string }> {
  const user = await requireCurrentUser();
  if (!getLabFeature(featureKey)) return { error: "존재하지 않는 기능입니다." };
  await prisma.labFeedback.upsert({
    where: { userId_featureKey: { userId: user.id, featureKey } },
    create: { userId: user.id, featureKey, vote },
    update: { vote },
  });
  return { ok: true, vote };
}

/** Record that the /lab page was viewed (impression) for the given features. */
export async function recordLabImpressions(keys: string[]): Promise<void> {
  await requireCurrentUser();
  const valid = keys.filter((k) => getLabFeature(k));
  await Promise.all(valid.map((k) => bumpLabCounter(k, "impressions")));
}
