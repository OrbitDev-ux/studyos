"use server";

import { revalidatePath } from "next/cache";
import { generateStructured } from "@/features/ai/client";
import {
  buildWeaknessAnalysisPrompt,
  WEAKNESS_ANALYSIS_SYSTEM_PROMPT,
} from "@/features/ai/prompts/weakness-analysis";
import {
  buildWeeklyReportPrompt,
  WEEKLY_REPORT_SYSTEM_PROMPT,
} from "@/features/ai/prompts/report-generation";
import { getWeaknessSourceData, getWeeklyReportSourceData } from "@/features/ai/queries";
import { aiAnalysisResultSchema } from "@/features/ai/schema";
import { getRecentDateOnlyRange, getZonedDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

const WEEKLY_REPORT_WINDOW_DAYS = 7;

export async function generateWeaknessAnalysis(): Promise<{ content: string }> {
  const user = await requireCurrentUser();
  const wrongAnswers = await getWeaknessSourceData(user.id);

  const { content } = await generateStructured({
    system: WEAKNESS_ANALYSIS_SYSTEM_PROMPT,
    prompt: buildWeaknessAnalysisPrompt(wrongAnswers),
    schema: aiAnalysisResultSchema,
    useThinking: true,
  });

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

export async function generateWeeklyReport(): Promise<{ content: string }> {
  const user = await requireCurrentUser();
  const data = await getWeeklyReportSourceData(user.id, user.timezone);

  const { content } = await generateStructured({
    system: WEEKLY_REPORT_SYSTEM_PROMPT,
    prompt: buildWeeklyReportPrompt(data),
    schema: aiAnalysisResultSchema,
    useThinking: true,
  });

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
