"use server";

import { revalidatePath } from "next/cache";
import { generateStructured } from "@/features/ai/client";
import { getActivePromptContent } from "@/features/ai/prompt-service";
import { PROMPT_TYPES } from "@/features/ai/prompt-registry";
import { buildMockExamGenerationPrompt } from "@/features/ai/prompts/mock-exam-generation";
import {
  mockExamGenerationFormSchema,
  submitExamSchema,
  type MockExamGenerationFormValues,
  type SubmitExamInput,
} from "@/features/mock-exam/schema";
import { aiProblemSetSchema } from "@/features/problems/schema";
import { normalizeAnswer } from "@/features/problems/utils";
import { recordProblemAttempt } from "@/features/learning/record-attempt";
import { scheduleForNewWrong } from "@/features/review/schedule";
import { withGenerationQuota, QuotaError } from "@/features/ai/generation-guard";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { headers } from "next/headers";

export async function generateMockExam(
  values: MockExamGenerationFormValues,
): Promise<{ examId?: string; error?: string }> {
  const user = await requireCurrentUser();
  const parsed = mockExamGenerationFormSchema.parse(values);

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.subjectId, userId: user.id },
  });
  if (!subject) throw new Error("과목을 찾을 수 없습니다.");

  const prompt = buildMockExamGenerationPrompt({
    subjectName: subject.name,
    style: parsed.style,
    count: parsed.count,
  });

  // AI cost protection — same per-user quota gate as problem generation.
  const ip = getClientIp(await headers());
  let problems;
  try {
    ({ problems } = await withGenerationQuota(
      {
        userId: user.id,
        email: user.email,
        timezone: user.timezone,
        ip,
        kind: "mock-exam",
        count: parsed.count,
      },
      async () =>
        generateStructured({
          system: await getActivePromptContent(PROMPT_TYPES.MOCK_EXAM_GENERATION),
          prompt,
          schema: aiProblemSetSchema,
        }),
    ));
  } catch (err) {
    if (err instanceof QuotaError) return { error: err.message };
    throw err;
  }

  const examId = await prisma.$transaction(async (tx) => {
    const exam = await tx.mockExam.create({
      data: {
        userId: user.id,
        subjectId: subject.id,
        title: `${subject.name} 모의고사${parsed.style ? ` · ${parsed.style}` : ""}`,
        style: parsed.style || null,
        timeLimitSec: parsed.timeLimitMinutes * 60,
      },
    });

    let order = 0;
    for (const item of problems) {
      // Mock exams are OMR-graded (multiple choice only) — skip any item the
      // AI returned without choices instead of creating an unanswerable question.
      if (!item.choices || item.choices.length === 0) continue;

      const problem = await tx.problem.create({
        data: {
          userId: user.id,
          subjectId: subject.id,
          type: "MULTIPLE_CHOICE",
          difficulty: "MEDIUM",
          prompt: item.prompt,
          explanation: item.explanation,
          choices: {
            create: item.choices.map((choice) => ({
              label: choice.label,
              content: choice.content,
              isCorrect: choice.isCorrect,
            })),
          },
        },
      });
      await tx.examQuestion.create({
        data: { examId: exam.id, problemId: problem.id, order },
      });
      order += 1;
    }

    return exam.id;
  });

  revalidatePath("/mock-exam");
  return { examId };
}

export async function submitExam(examId: string, input: SubmitExamInput) {
  const user = await requireCurrentUser();
  const parsed = submitExamSchema.parse(input);

  const exam = await prisma.mockExam.findFirst({
    where: { id: examId, userId: user.id },
    include: { questions: { include: { problem: { include: { choices: true } } } } },
  });
  if (!exam) throw new Error("모의고사를 찾을 수 없습니다.");

  const answerByProblemId = new Map(
    parsed.answers.map((answer) => [answer.problemId, answer]),
  );

  const result = await prisma.$transaction(async (tx) => {
    const examResult = await tx.examResult.create({
      data: {
        examId: exam.id,
        userId: user.id,
        score: 0,
        totalCount: exam.questions.length,
        correctCount: 0,
        durationSec: parsed.durationSec,
      },
    });

    let correctCount = 0;
    for (const question of exam.questions) {
      const problem = question.problem;
      const answer = answerByProblemId.get(problem.id);
      const selectedChoice =
        problem.type === "MULTIPLE_CHOICE"
          ? problem.choices.find((choice) => choice.id === answer?.choiceId)
          : undefined;
      const isCorrect =
        problem.type === "MULTIPLE_CHOICE"
          ? (selectedChoice?.isCorrect ?? false)
          : normalizeAnswer(answer?.text ?? "") ===
            normalizeAnswer(problem.answerText ?? "");

      if (isCorrect) correctCount += 1;

      await tx.examAnswer.create({
        data: {
          examResultId: examResult.id,
          problemId: problem.id,
          selectedChoiceId:
            problem.type === "MULTIPLE_CHOICE" ? (answer?.choiceId ?? null) : null,
          answerText: problem.type === "SHORT_ANSWER" ? (answer?.text ?? null) : null,
          isCorrect,
        },
      });

      // Log this attempt to the learning data foundation (same log as practice
      // problems). Per-question timing isn't tracked for exams, so durationMs
      // stays null.
      await recordProblemAttempt(
        {
          userId: user.id,
          problemId: problem.id,
          subjectId: problem.subjectId ?? null,
          unit: problem.unit ?? null,
          difficulty: problem.difficulty,
          isCorrect,
          source: "mock-exam",
          answerText:
            problem.type === "MULTIPLE_CHOICE"
              ? (selectedChoice?.content ?? null)
              : (answer?.text?.trim() || null),
        },
        tx,
      );

      if (!isCorrect) {
        // Register into the spaced-repetition schedule (Phase 5): reset to
        // stage 0, due after the first interval. Kept inline in the exam's
        // transaction (rather than calling the service) so it commits atomically
        // with the ExamResult/ExamAnswer rows.
        const schedule = scheduleForNewWrong();
        await tx.wrongAnswer.upsert({
          where: { userId_problemId: { userId: user.id, problemId: problem.id } },
          create: {
            userId: user.id,
            problemId: problem.id,
            source: "mock-exam",
            reviewStage: schedule.reviewStage,
            nextReviewAt: schedule.nextReviewAt,
          },
          update: {
            resolved: false,
            source: "mock-exam",
            reviewStage: schedule.reviewStage,
            nextReviewAt: schedule.nextReviewAt,
            lastReviewedAt: new Date(),
          },
        });
      }
    }

    const totalCount = exam.questions.length;
    const score = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);

    return tx.examResult.update({
      where: { id: examResult.id },
      data: { score, correctCount },
    });
  });

  revalidatePath("/mock-exam");
  revalidatePath("/review");

  return {
    examResultId: result.id,
    score: result.score,
    correctCount: result.correctCount,
    totalCount: result.totalCount,
  };
}
