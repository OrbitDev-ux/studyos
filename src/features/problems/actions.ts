"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { generateStructured } from "@/features/ai/client";
import { getActivePromptContent } from "@/features/ai/prompt-service";
import { PROMPT_TYPES } from "@/features/ai/prompt-registry";
import { buildProblemGenerationPrompt } from "@/features/ai/prompts/problem-generation";
import {
  aiProblemSetSchema,
  problemGenerationFormSchema,
  type ProblemGenerationFormValues,
} from "@/features/problems/schema";
import { normalizeAnswer } from "@/features/problems/utils";
import { recordProblemAttempt, type AttemptSource } from "@/features/learning/record-attempt";
import {
  recordReviewSuccess,
  registerWrongAnswerForReview,
} from "@/features/review/schedule-service";
import { resolveTaxonomy } from "@/features/curriculum/taxonomy";
import {
  withGenerationQuota,
  generationErrorPayload,
  type GenerationErrorPayload,
} from "@/features/ai/generation-guard";
import { accessStateFor, trialStartedDate } from "@/features/billing/access";
import { DEFAULT_SUBJECTS, SUBJECT_COLOR_PALETTE } from "@/features/subjects/constants";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/session";
import { headers } from "next/headers";

export async function generateProblems(
  values: ProblemGenerationFormValues,
): Promise<{ error?: string } | GenerationErrorPayload> {
  const user = await requireCurrentUser();
  const parsed = problemGenerationFormSchema.parse(values);

  // Server is the authoritative source for taxonomy: re-validate the whole
  // (grade → subject → unit) path against the static tree and derive canonical
  // names. Client-sent ids are never trusted, and the AI never invents subjects
  // or units — we pass it the canonical ones and store those verbatim.
  const resolved = resolveTaxonomy({
    gradeId: parsed.gradeId,
    subjectId: parsed.subjectId,
    unitId: parsed.unitId,
  });
  if (!resolved.ok) return { error: resolved.error };
  const { subjectName, unitName } = resolved.value;

  const supabase = await createClient();

  // Map the canonical taxonomy subject onto the user's OWN Subject row (every
  // user is seeded with 수학/영어/국어/과학), creating it if missing. Keeps
  // Problem.subjectId pointing at a per-user Subject exactly as before, so all
  // Learning-OS aggregations (weakness/mission/review) keep working unchanged.
  const defaultColor = DEFAULT_SUBJECTS.find((s) => s.name === subjectName)?.color;
  const subject = await prisma.subject.upsert({
    where: { userId_name: { userId: user.id, name: subjectName } },
    create: {
      userId: user.id,
      name: subjectName,
      color: defaultColor ?? SUBJECT_COLOR_PALETTE[0],
    },
    update: {},
  });

  const prompt = buildProblemGenerationPrompt({
    subjectName,
    unit: unitName ?? undefined,
    difficulty: parsed.difficulty,
    type: parsed.type,
    count: parsed.count,
  });

  // AI cost protection: reserve a quota slot (per-user advisory lock) BEFORE the
  // Gemini call. Over-quota throws QuotaError and no AI call happens. Only the
  // AI call is inside the guard, so success is recorded exactly when the (valid,
  // schema-checked) result comes back — DB persistence below can't affect quota.
  const ip = getClientIp(await headers());
  let problems;
  try {
    ({ problems } = await withGenerationQuota(
      {
        userId: user.id,
        timezone: user.timezone,
        ip,
        kind: "problem",
        count: parsed.count,
        // Server-authoritative plan/trial state — never from the client.
        state: accessStateFor(user),
        trialStartedAt: trialStartedDate(user),
      },
      async () =>
        generateStructured({
          system: await getActivePromptContent(PROMPT_TYPES.PROBLEM_GENERATION),
          prompt,
          schema: aiProblemSetSchema,
        }),
    ));
  } catch (err) {
    // Plan-limit / rate rejections are expected outcomes — return a structured
    // payload (with upgrade info) so it survives to the client (thrown Server
    // Action errors are masked in production). Real failures rethrow.
    const payload = generationErrorPayload(err);
    if (payload) return payload;
    throw err;
  }

  const problemSetId = randomUUID();
  const { error: setError } = await supabase.from("ProblemSet").insert({
    id: problemSetId,
    userId: user.id,
    subjectId: subject.id,
    title: `${subject.name}${unitName ? ` · ${unitName}` : ""}`,
    unit: unitName,
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
        unit: unitName,
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
  return {};
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
  opts?: { source?: Extract<AttemptSource, "practice" | "review">; durationMs?: number },
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

  const selectedChoice =
    problem.type === "MULTIPLE_CHOICE"
      ? problem.choices.find(
          (choice: { id: string; isCorrect: boolean }) => choice.id === answer.choiceId,
        )
      : undefined;

  const correct =
    problem.type === "MULTIPLE_CHOICE"
      ? (selectedChoice?.isCorrect ?? false)
      : normalizeAnswer(answer.text ?? "") === normalizeAnswer(problem.answerText ?? "");

  // The user's answer in readable form, for the attempt log / 오답 DNA.
  const userAnswerText =
    problem.type === "MULTIPLE_CHOICE"
      ? ((selectedChoice as { content?: string } | undefined)?.content ?? null)
      : (answer.text?.trim() || null);

  // Log every attempt (correct or wrong) to the learning data foundation.
  await recordProblemAttempt({
    userId: user.id,
    problemId,
    subjectId: problem.subjectId ?? null,
    unit: problem.unit ?? null,
    difficulty: problem.difficulty,
    isCorrect: correct,
    source: opts?.source ?? "practice",
    answerText: userAnswerText,
    durationMs: opts?.durationMs ?? null,
  });

  // Spaced-repetition scheduling (Phase 5). A correct answer advances the
  // review schedule (and graduates the item after the last interval); a wrong
  // answer registers/re-opens it as due after the first interval. This replaces
  // the old plain resolved-toggle so every submission keeps the schedule
  // consistent.
  if (correct) {
    await recordReviewSuccess(user.id, problemId);
  } else {
    await registerWrongAnswerForReview(user.id, problemId, "problem");
  }

  revalidatePath("/problems");
  revalidatePath("/review");
  return { correct, explanation: problem.explanation };
}
