"use server";

import { revalidatePath } from "next/cache";
import {
  ANSWER_EXPLANATION_SYSTEM_PROMPT,
  buildAnswerExplanationPrompt,
} from "@/features/ai/prompts/answer-explanation";
import { generateStructured } from "@/features/ai/client";
import { aiExplanationSchema } from "@/features/review/schema";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export async function requestAiExplanation(
  wrongAnswerId: string,
): Promise<{ explanation: string }> {
  const user = await requireCurrentUser();
  const wrongAnswer = await prisma.wrongAnswer.findFirst({
    where: { id: wrongAnswerId, userId: user.id },
    include: { problem: { include: { choices: true } } },
  });
  if (!wrongAnswer) throw new Error("오답 기록을 찾을 수 없습니다.");

  const correctAnswer =
    wrongAnswer.problem.type === "MULTIPLE_CHOICE"
      ? (wrongAnswer.problem.choices.find((choice) => choice.isCorrect)?.content ?? "")
      : (wrongAnswer.problem.answerText ?? "");

  const { explanation } = await generateStructured({
    system: ANSWER_EXPLANATION_SYSTEM_PROMPT,
    prompt: buildAnswerExplanationPrompt({
      prompt: wrongAnswer.problem.prompt,
      correctAnswer,
    }),
    schema: aiExplanationSchema,
    useThinking: true,
  });

  await prisma.wrongAnswer.update({
    where: { id: wrongAnswer.id },
    data: { aiExplanation: explanation },
  });

  revalidatePath("/review");
  return { explanation };
}

export async function markResolved(wrongAnswerId: string) {
  const user = await requireCurrentUser();
  await prisma.wrongAnswer.updateMany({
    where: { id: wrongAnswerId, userId: user.id },
    data: { resolved: true },
  });
  revalidatePath("/review");
}
