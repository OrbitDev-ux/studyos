"use server";

import { revalidatePath } from "next/cache";
import { generateStructured } from "@/features/ai/client";
import { getActivePromptContent } from "@/features/ai/prompt-service";
import { PROMPT_TYPES } from "@/features/ai/prompt-registry";
import { buildMockExamGenerationPrompt } from "@/features/ai/prompts/mock-exam-generation";
import { buildProblemGenerationPrompt } from "@/features/ai/prompts/problem-generation";
import {
  mockExamGenerationFormSchema,
  submitExamSchema,
  type MockExamGenerationFormValues,
  type SubmitExamInput,
} from "@/features/mock-exam/schema";
import { aiProblemSetSchema } from "@/features/problems/schema";
import { normalizeAnswer } from "@/features/problems/utils";
import { recordProblemAttempt } from "@/features/learning/record-attempt";
import { registerWrongAnswerForReview } from "@/features/review/schedule-service";
import {
  withGenerationQuota,
  generationErrorPayload,
  type GenerationErrorPayload,
} from "@/features/ai/generation-guard";
import { accessStateFor, trialStartedDate } from "@/features/billing/access";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { headers } from "next/headers";

export async function generateMockExam(
  values: MockExamGenerationFormValues,
): Promise<{ examId?: string } & Partial<GenerationErrorPayload>> {
  const user = await requireCurrentUser();
  // Server-authoritative validation (see problems/actions). Rejects invalid or
  // oversized 문항 수 (객관식+서술형 합계 상한 포함) with a clear message.
  const validation = mockExamGenerationFormSchema.safeParse(values);
  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
    };
  }
  const parsed = validation.data;

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.subjectId, userId: user.id },
  });
  if (!subject) throw new Error("과목을 찾을 수 없습니다.");

  const prompt = buildMockExamGenerationPrompt({
    subjectName: subject.name,
    style: parsed.style,
    count: parsed.count,
  });

  // AI cost protection — same per-user quota gate as problem generation. Both
  // the MC and (optional) 서술형 calls run inside ONE reservation.
  const ip = getClientIp(await headers());
  let mcProblems;
  let essayProblems;
  try {
    ({ mcProblems, essayProblems } = await withGenerationQuota(
      {
        userId: user.id,
        timezone: user.timezone,
        ip,
        kind: "mock-exam",
        count: parsed.count,
        state: accessStateFor(user),
        trialStartedAt: trialStartedDate(user),
      },
      async () => {
        const mc = await generateStructured({
          system: await getActivePromptContent(PROMPT_TYPES.MOCK_EXAM_GENERATION),
          prompt,
          schema: aiProblemSetSchema,
        });
        const essay =
          parsed.essayCount > 0
            ? await generateStructured({
                system: await getActivePromptContent(PROMPT_TYPES.PROBLEM_GENERATION),
                prompt: buildProblemGenerationPrompt({
                  subjectName: subject.name,
                  difficulty: "MEDIUM",
                  type: "ESSAY",
                  count: parsed.essayCount,
                }),
                schema: aiProblemSetSchema,
                timeoutMs: 40_000,
              })
            : { problems: [] };
        return { mcProblems: mc.problems, essayProblems: essay.problems };
      },
    ));
  } catch (err) {
    const payload = generationErrorPayload(err);
    if (payload) return payload;
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
    // Auto-graded MC questions first (OMR).
    for (const item of mcProblems) {
      // Skip any item the AI returned without choices instead of creating an
      // unanswerable OMR question.
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

    // 서술형 questions last — self-reviewed, excluded from the auto-graded score.
    for (const item of essayProblems) {
      const problem = await tx.problem.create({
        data: {
          userId: user.id,
          subjectId: subject.id,
          type: "ESSAY",
          difficulty: "MEDIUM",
          prompt: item.prompt,
          explanation: item.explanation,
          answerText: item.answerText || null,
          scoringCriteria: item.scoringCriteria || null,
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

export async function deleteMockExam(examId: string) {
  const user = await requireCurrentUser();
  // Cascades to ExamQuestion/ExamResult/ExamAnswer at the DB level (schema's
  // onDelete: Cascade) — the generated Problem rows themselves are left
  // alone, same as every other "delete the container, keep the shared
  // problem pool" pattern in this app.
  await prisma.mockExam.deleteMany({ where: { id: examId, userId: user.id } });
  revalidatePath("/mock-exam");
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

  // Only auto-gradable questions (MC / short-answer) count toward the score;
  // 서술형 is self-reviewed and excluded from scoring.
  const gradedCount = exam.questions.filter((q) => q.problem.type !== "ESSAY").length;

  const result = await prisma.$transaction(async (tx) => {
    const examResult = await tx.examResult.create({
      data: {
        examId: exam.id,
        userId: user.id,
        score: 0,
        totalCount: gradedCount,
        correctCount: 0,
        durationSec: parsed.durationSec,
      },
    });

    let correctCount = 0;
    for (const question of exam.questions) {
      const problem = question.problem;
      const answer = answerByProblemId.get(problem.id);

      // 서술형: store the answer for self-review only — never graded, so it does
      // not touch the score, the ProblemAttempt accuracy log, or the review
      // schedule (which would otherwise be corrupted by an ungraded item).
      if (problem.type === "ESSAY") {
        await tx.examAnswer.create({
          data: {
            examResultId: examResult.id,
            problemId: problem.id,
            selectedChoiceId: null,
            answerText: answer?.text ?? null,
            isCorrect: false,
          },
        });
        continue;
      }

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
              : answer?.text?.trim() || null,
        },
        tx,
      );

      if (!isCorrect) {
        // Same spaced-repetition registration /problems uses on a wrong
        // answer (Product Audit: this used to be a separate inline upsert
        // that skipped the ease-factor adaptation on a repeat lapse and
        // incorrectly overwrote `source` on conflict). Passing `tx` keeps it
        // committing atomically with the ExamResult/ExamAnswer rows.
        await registerWrongAnswerForReview(
          user.id,
          problem.id,
          "mock-exam",
          new Date(),
          tx,
        );
      }
    }

    // Score over the auto-graded questions only (essays excluded).
    const score = gradedCount === 0 ? 0 : Math.round((correctCount / gradedCount) * 100);

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
