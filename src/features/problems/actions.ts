"use server";

import { randomUUID } from "crypto";
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
import { normalizeAnswer } from "@/features/problems/utils";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/session";

export async function generateProblems(values: ProblemGenerationFormValues) {
  const user = await requireCurrentUser();
  const parsed = problemGenerationFormSchema.parse(values);
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("Subject")
    .select("*")
    .eq("id", parsed.subjectId)
    .eq("userId", user.id)
    .maybeSingle();
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

  const problemSetId = randomUUID();
  const { error: setError } = await supabase.from("ProblemSet").insert({
    id: problemSetId,
    userId: user.id,
    subjectId: subject.id,
    title: `${subject.name}${parsed.unit ? ` · ${parsed.unit}` : ""}`,
    unit: parsed.unit || null,
    difficulty: parsed.difficulty,
  });
  if (setError) throw setError;

  // PostgREST is one statement per request — no multi-table transaction
  // like the old prisma.$transaction(). Insert sequentially and, if a
  // later insert fails, best-effort clean up what already landed instead
  // of leaving an unrolled-back partial batch. Deleting a Problem cascades
  // to its Choices at the DB level, so only the Problem ids need tracking.
  const insertedProblemIds: string[] = [];
  try {
    for (const problem of problems) {
      const problemId = randomUUID();
      const { error: problemError } = await supabase.from("Problem").insert({
        id: problemId,
        userId: user.id,
        problemSetId,
        subjectId: subject.id,
        type: parsed.type,
        difficulty: parsed.difficulty,
        unit: parsed.unit || null,
        prompt: problem.prompt,
        explanation: problem.explanation,
        answerText: problem.answerText || null,
      });
      if (problemError) throw problemError;
      insertedProblemIds.push(problemId);

      if (problem.choices) {
        const { error: choiceError } = await supabase.from("Choice").insert(
          problem.choices.map((choice) => ({
            id: randomUUID(),
            problemId,
            label: choice.label,
            content: choice.content,
            isCorrect: choice.isCorrect,
          })),
        );
        if (choiceError) throw choiceError;
      }
    }
  } catch (err) {
    if (insertedProblemIds.length > 0) {
      await supabase.from("Problem").delete().in("id", insertedProblemIds);
    }
    await supabase.from("ProblemSet").delete().eq("id", problemSetId);
    throw err;
  }

  revalidatePath("/problems");
}

export async function toggleFavorite(problemId: string) {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: problem } = await supabase
    .from("Problem")
    .select("isFavorite")
    .eq("id", problemId)
    .eq("userId", user.id)
    .maybeSingle();
  if (!problem) return;

  const { error } = await supabase
    .from("Problem")
    .update({ isFavorite: !problem.isFavorite })
    .eq("id", problemId);
  if (error) throw error;

  revalidatePath("/problems");
}

export async function deleteProblem(problemId: string) {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("Problem")
    .delete()
    .eq("id", problemId)
    .eq("userId", user.id);
  if (error) throw error;

  revalidatePath("/problems");
}

/**
 * Grades one attempt at a problem. Used both for first attempts on /problems
 * and for retries on /review — a correct retry resolves the matching
 * WrongAnswer row instead of leaving it duplicated.
 */
export async function submitProblemAnswer(
  problemId: string,
  answer: { choiceId?: string; text?: string },
): Promise<{ correct: boolean; explanation: string | null }> {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: problem } = await supabase
    .from("Problem")
    .select("*, choices:Choice(*)")
    .eq("id", problemId)
    .eq("userId", user.id)
    .maybeSingle();
  if (!problem) throw new Error("문제를 찾을 수 없습니다.");

  const correct =
    problem.type === "MULTIPLE_CHOICE"
      ? (problem.choices.find(
          (choice: { id: string; isCorrect: boolean }) => choice.id === answer.choiceId,
        )?.isCorrect ?? false)
      : normalizeAnswer(answer.text ?? "") === normalizeAnswer(problem.answerText ?? "");

  if (correct) {
    const { error } = await supabase
      .from("WrongAnswer")
      .update({ resolved: true })
      .eq("userId", user.id)
      .eq("problemId", problemId)
      .eq("resolved", false);
    if (error) throw error;
  } else {
    // Same create-then-update-only-on-conflict semantics as the old
    // prisma.wrongAnswer.upsert(): a fresh row gets source: "problem", but
    // an existing row (e.g. originally logged from a mock exam) only has
    // `resolved` touched — its `source` must not be overwritten.
    const { error: insertError } = await supabase.from("WrongAnswer").insert({
      id: randomUUID(),
      userId: user.id,
      problemId,
      source: "problem",
    });
    if (insertError) {
      if (insertError.code === "23505") {
        const { error: updateError } = await supabase
          .from("WrongAnswer")
          .update({ resolved: false })
          .eq("userId", user.id)
          .eq("problemId", problemId);
        if (updateError) throw updateError;
      } else {
        throw insertError;
      }
    }
  }

  revalidatePath("/problems");
  revalidatePath("/review");
  return { correct, explanation: problem.explanation };
}
