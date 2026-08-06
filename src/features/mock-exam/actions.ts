"use server";

import { revalidatePath } from "next/cache";
import { generateStructured } from "@/features/ai/client";
import {
  buildMockExamGenerationPrompt,
  MOCK_EXAM_GENERATION_SYSTEM_PROMPT,
} from "@/features/ai/prompts/mock-exam-generation";
import {
  mockExamGenerationFormSchema,
  submitExamSchema,
  type MockExamGenerationFormValues,
  type SubmitExamInput,
} from "@/features/mock-exam/schema";
import { aiProblemSetSchema } from "@/features/problems/schema";
import { normalizeAnswer } from "@/features/problems/utils";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

// AI exam generation regularly runs past Vercel's default serverless
// timeout — a 3-question exam alone took ~20s locally against the real
// Gemini call before any DB writes.
export const maxDuration = 60;

export async function generateMockExam(
  values: MockExamGenerationFormValues,
): Promise<string> {
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

  const { problems } = await generateStructured({
    system: MOCK_EXAM_GENERATION_SYSTEM_PROMPT,
    prompt,
    schema: aiProblemSetSchema,
  });

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
  return examId;
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
      const isCorrect =
        problem.type === "MULTIPLE_CHOICE"
          ? (problem.choices.find((choice) => choice.id === answer?.choiceId)
              ?.isCorrect ?? false)
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

      if (!isCorrect) {
        await tx.wrongAnswer.upsert({
          where: { userId_problemId: { userId: user.id, problemId: problem.id } },
          create: { userId: user.id, problemId: problem.id, source: "mock-exam" },
          update: { resolved: false, source: "mock-exam" },
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
