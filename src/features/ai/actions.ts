"use server";

import { revalidatePath } from "next/cache";
import { generateStructured, aiErrorResult } from "@/features/ai/client";
import { getActivePromptContent } from "@/features/ai/prompt-service";
import { PROMPT_TYPES } from "@/features/ai/prompt-registry";
import { buildWeaknessAnalysisPrompt } from "@/features/ai/prompts/weakness-analysis";
import { buildWeeklyReportPrompt } from "@/features/ai/prompts/report-generation";
import { getWeaknessSourceData, getWeeklyReportSourceData } from "@/features/ai/queries";
import { aiAnalysisResultSchema } from "@/features/ai/schema";
import { getRecentDateOnlyRange, getZonedDateOnly } from "@/lib/date";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

const WEEKLY_REPORT_WINDOW_DAYS = 7;

/** AI analysis/recommendation is gated by plan (blocked once a trial expires).
 * Returns a user-safe error string when blocked, else null. */
function aiRecommendationGateError(
  user: Parameters<typeof accessStateFor>[0],
): string | null {
  return canUseFeature(accessStateFor(user), "AI_RECOMMENDATION")
    ? null
    : "AI 분석은 플랜에서 사용할 수 있어요. 플랜을 선택해주세요.";
}

export async function generateWeaknessAnalysis(): Promise<
  { content: string } | { error: string }
> {
  const user = await requireCurrentUser();
  const gate = aiRecommendationGateError(user);
  if (gate) return { error: gate };
  const wrongAnswers = await getWeaknessSourceData(user.id);

  let content: string;
  try {
    ({ content } = await generateStructured({
      system: await getActivePromptContent(PROMPT_TYPES.WEAKNESS_ANALYSIS),
      prompt: buildWeaknessAnalysisPrompt(wrongAnswers),
      schema: aiAnalysisResultSchema,
      useThinking: true,
    }));
  } catch (err) {
    const payload = aiErrorResult(err);
    if (payload) return { error: payload.error };
    throw err;
  }

  const today = getZonedDateOnly(user.timezone);
  await prisma.aiAnalysis.create({
    data: {
      userId: user.id,
      type: "weakness",
      content,
      periodStart: today,
      periodEnd: today,
    },
  });

  revalidatePath("/dashboard");
  return { content };
}

export async function generateWeeklyReport(): Promise<
  { content: string } | { error: string }
> {
  const user = await requireCurrentUser();
  const gate = aiRecommendationGateError(user);
  if (gate) return { error: gate };
  const data = await getWeeklyReportSourceData(user.id, user.timezone);

  let content: string;
  try {
    ({ content } = await generateStructured({
      system: await getActivePromptContent(PROMPT_TYPES.WEEKLY_REPORT),
      prompt: buildWeeklyReportPrompt(data),
      schema: aiAnalysisResultSchema,
      useThinking: true,
    }));
  } catch (err) {
    const payload = aiErrorResult(err);
    if (payload) return { error: payload.error };
    throw err;
  }

  const { startDate, endDate } = getRecentDateOnlyRange(
    user.timezone,
    WEEKLY_REPORT_WINDOW_DAYS,
  );

  await prisma.aiAnalysis.create({
    data: {
      userId: user.id,
      type: "weekly-report",
      content,
      periodStart: startDate,
      periodEnd: endDate,
    },
  });

  revalidatePath("/dashboard");
  return { content };
}
