"use server";

import { revalidatePath } from "next/cache";
import { buildAnswerExplanationPrompt } from "@/features/ai/prompts/answer-explanation";
import { buildWrongAnswerDnaPrompt } from "@/features/ai/prompts/wrong-answer-dna";
import { generateStructured, aiErrorResult } from "@/features/ai/client";
import { getActivePromptContent } from "@/features/ai/prompt-service";
import { PROMPT_TYPES } from "@/features/ai/prompt-registry";
import { wrongAnswerDnaSchema, type WrongAnswerDna } from "@/features/review/dna";
import { aiExplanationSchema } from "@/features/review/schema";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export async function requestAiExplanation(
  wrongAnswerId: string,
): Promise<{ explanation: string } | { error: string }> {
  const user = await requireCurrentUser();
  const wrongAnswer = await prisma.wrongAnswer.findFirst({
    where: { id: wrongAnswerId, userId: user.id },
    include: { problem: { include: { choices: true } } },
  });
  if (!wrongAnswer) return { error: "오답 기록을 찾을 수 없습니다." };

  const correctAnswer =
    wrongAnswer.problem.type === "MULTIPLE_CHOICE"
      ? (wrongAnswer.problem.choices.find((choice) => choice.isCorrect)?.content ?? "")
      : (wrongAnswer.problem.answerText ?? "");

  let explanation: string;
  try {
    ({ explanation } = await generateStructured({
      system: await getActivePromptContent(PROMPT_TYPES.ANSWER_EXPLANATION),
      prompt: buildAnswerExplanationPrompt({
        prompt: wrongAnswer.problem.prompt,
        correctAnswer,
      }),
      schema: aiExplanationSchema,
      useThinking: true,
    }));
  } catch (err) {
    // Return an accurate, client-safe message (thrown Server Action errors are
    // masked in production) — most commonly a transient Gemini 429 rate limit.
    const payload = aiErrorResult(err);
    if (payload) return { error: payload.error };
    throw err;
  }

  await prisma.wrongAnswer.update({
    where: { id: wrongAnswer.id },
    data: { aiExplanation: explanation },
  });

  revalidatePath("/review");
  return { explanation };
}

/**
 * 오답 DNA (Phase 4): diagnose *why* a wrong answer was wrong via Gemini and
 * store the structured result on the WrongAnswer row. On-demand only (user
 * presses the button) and skipped if already analyzed — the AI-cost policy is
 * "analyze once per wrong answer, never on page load". The user's actual answer
 * comes from the most recent wrong ProblemAttempt for this problem.
 */
export async function analyzeWrongAnswerDna(
  wrongAnswerId: string,
): Promise<WrongAnswerDna | { error: string }> {
  const user = await requireCurrentUser();

  // Plan gate (server-authoritative backstop; the UI also hides this for
  // non-entitled plans). 오답 DNA is a PRO+ feature.
  if (!canUseFeature(accessStateFor(user), "WRONG_ANSWER_DNA")) {
    return { error: "오답 DNA는 PRO 플랜에서 사용할 수 있어요." };
  }

  const wrongAnswer = await prisma.wrongAnswer.findFirst({
    where: { id: wrongAnswerId, userId: user.id },
    include: { problem: { include: { choices: true, subject: true } } },
  });
  if (!wrongAnswer) return { error: "오답 기록을 찾을 수 없습니다." };

  // Already analyzed → return the stored diagnosis instead of paying for a
  // second AI call.
  if (wrongAnswer.analyzedAt && wrongAnswer.errorType) {
    return {
      type: wrongAnswerDnaSchema.shape.type.parse(wrongAnswer.errorType),
      concept: wrongAnswer.errorConcept ?? "",
      reason: wrongAnswer.errorReason ?? "",
    };
  }

  const { problem } = wrongAnswer;
  const correctAnswer =
    problem.type === "MULTIPLE_CHOICE"
      ? (problem.choices.find((choice) => choice.isCorrect)?.content ?? "")
      : (problem.answerText ?? "");

  // The user's actual wrong answer, from the attempt log.
  const lastWrongAttempt = await prisma.problemAttempt.findFirst({
    where: { userId: user.id, problemId: problem.id, isCorrect: false },
    orderBy: { createdAt: "desc" },
    select: { answerText: true },
  });

  let dna: WrongAnswerDna;
  try {
    dna = await generateStructured({
      system: await getActivePromptContent(PROMPT_TYPES.WRONG_ANSWER_DNA),
      prompt: buildWrongAnswerDnaPrompt({
        prompt: problem.prompt,
        userAnswer: lastWrongAttempt?.answerText ?? null,
        correctAnswer,
        subject: problem.subject?.name ?? "미지정",
        unit: problem.unit,
      }),
      schema: wrongAnswerDnaSchema,
      useThinking: true,
    });
  } catch (err) {
    const payload = aiErrorResult(err);
    if (payload) return { error: payload.error };
    throw err;
  }

  await prisma.wrongAnswer.update({
    where: { id: wrongAnswer.id },
    data: {
      errorType: dna.type,
      errorConcept: dna.concept,
      errorReason: dna.reason,
      analyzedAt: new Date(),
    },
  });

  revalidatePath("/review");
  return dna;
}

export async function markResolved(wrongAnswerId: string) {
  const user = await requireCurrentUser();
  await prisma.wrongAnswer.updateMany({
    where: { id: wrongAnswerId, userId: user.id },
    data: { resolved: true },
  });
  revalidatePath("/review");
}
