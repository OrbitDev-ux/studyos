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

/** Weakness/weekly-report AI analysis is a PRO+ feature (see the stats page,
 * which hides these cards the same way behind ADVANCED_ANALYTICS — this is
 * the server-authoritative backstop for that same boundary, not a separate
 * policy). Returns a user-safe error string when blocked, else null. */
function aiRecommendationGateError(
  user: Parameters<typeof accessStateFor>[0],
): string | null {
  return canUseFeature(accessStateFor(user), "ADVANCED_ANALYTICS")
    ? null
    : "AI 분석은 Pro 플랜부터 사용할 수 있어요.";
}

export async function generateWeaknessAnalysis(): Promise<
  { content: string } | { error: string }
> {
  const user = await requireCurrentUser();
  const gate = aiRecommendationGateError(user);
  if (gate) return { error: gate };

  const today = getZonedDateOnly(user.timezone);
  // Same-day cache — also the anti-abuse guard (Security audit: this endpoint
  // had no quota at all; a useThinking:true call is the most expensive kind).
  // The underlying data can't change materially within one day, so this is a
  // real "don't redo the same work" cache, not just a rate-limit hack.
  const cached = await prisma.aiAnalysis.findFirst({
    where: { userId: user.id, type: "weakness", periodStart: today, periodEnd: today },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });
  if (cached) return { content: cached.content };

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

  const { startDate, endDate } = getRecentDateOnlyRange(
    user.timezone,
    WEEKLY_REPORT_WINDOW_DAYS,
  );
  // Same-window cache — also the anti-abuse guard (Security audit: this
  // endpoint had no quota at all). The source window is identical on repeat
  // calls within the same period, so this is a real cache, not just a
  // rate-limit hack.
  const cached = await prisma.aiAnalysis.findFirst({
    where: {
      userId: user.id,
      type: "weekly-report",
      periodStart: startDate,
      periodEnd: endDate,
    },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });
  if (cached) return { content: cached.content };

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
