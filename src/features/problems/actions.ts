"use server";

import { revalidatePath } from "next/cache";
import { generateStructured } from "@/features/ai/client";
import {
  buildProblemGenerationPrompt,
  PROBLEM_GENERATION_SYSTEM_PROMPT,
} from "@/features/ai/prompts/problem-generation";
import {
  aiProblemSetSchema,
  problemGenerationFormSchema,
  type ProblemGenerationFormValues,
} from "@/features/problems/schema";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export async function generateProblems(values: ProblemGenerationFormValues) {
  const user = await requireCurrentUser();
  const parsed = problemGenerationFormSchema.parse(values);

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.subjectId, userId: user.id },
  });
  if (!subject) throw new Error("과목을 찾을 수 없습니다.");

  const prompt = buildProblemGenerationPrompt({
    subjectName: subject.name,
    unit: parsed.unit,
    difficulty: parsed.difficulty,
    type: parsed.type,
    count: parsed.count,
  });

  const { problems } = await generateStructured({
    system: PROBLEM_GENERATION_SYSTEM_PROMPT,
    prompt,
    schema: aiProblemSetSchema,
  });

  const problemSet = await prisma.problemSet.create({
    data: {
      userId: user.id,
      subjectId: subject.id,
      title: `${subject.name}${parsed.unit ? ` · ${parsed.unit}` : ""}`,
      unit: parsed.unit || null,
      difficulty: parsed.difficulty,
    },
  });

  await prisma.$transaction(
    problems.map((problem) =>
      prisma.problem.create({
        data: {
          userId: user.id,
          problemSetId: problemSet.id,
          subjectId: subject.id,
          type: parsed.type,
          difficulty: parsed.difficulty,
          unit: parsed.unit || null,
          prompt: problem.prompt,
          explanation: problem.explanation,
          answerText: problem.answerText || null,
          choices: problem.choices
            ? {
                create: problem.choices.map((choice) => ({
                  label: choice.label,
                  content: choice.content,
                  isCorrect: choice.isCorrect,
                })),
              }
            : undefined,
        },
      }),
    ),
  );

  revalidatePath("/problems");
}

export async function toggleFavorite(problemId: string) {
  const user = await requireCurrentUser();
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, userId: user.id },
  });
  if (!problem) return;

  await prisma.problem.update({
    where: { id: problemId },
    data: { isFavorite: !problem.isFavorite },
  });
  revalidatePath("/problems");
}

export async function deleteProblem(problemId: string) {
  const user = await requireCurrentUser();
  await prisma.problem.deleteMany({ where: { id: problemId, userId: user.id } });
  revalidatePath("/problems");
}
