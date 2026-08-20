"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { generateStructured, aiErrorResult } from "@/features/ai/client";
import { getActivePromptContent } from "@/features/ai/prompt-service";
import { PROMPT_TYPES } from "@/features/ai/prompt-registry";
import {
  buildProblemGenerationPrompt,
  buildSimilarProblemPrompt,
} from "@/features/ai/prompts/problem-generation";
import {
  aiProblemSetSchema,
  problemGenerationFormSchema,
  type ProblemGenerationFormValues,
} from "@/features/problems/schema";
import { filterDuplicateProblems } from "@/features/problems/dedup";
import { generationBudgetFor } from "@/features/problems/generation-budget";
import { filterUngradableAnswers } from "@/features/problems/validate-generated";
import { gradeAnswer } from "@/features/problems/grading";
import {
  recordProblemAttempt,
  type AttemptSource,
} from "@/features/learning/record-attempt";
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
import { problemLocaleInstruction } from "@/features/i18n/ai";
import { getServerLocale } from "@/features/i18n/server";
import { IMPORT_SOURCE } from "@/features/problems/import/types";
import { DEFAULT_SUBJECTS, SUBJECT_COLOR_PALETTE } from "@/features/subjects/constants";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/session";
import { headers } from "next/headers";
import type { Difficulty, QuestionType } from "@/generated/prisma/client";

type SimilarProblemResult = {
  id: string;
  userId: string;
  problemSetId: string;
  subjectId: string;
  type: QuestionType;
  difficulty: Difficulty;
  unit: string | null;
  prompt: string;
  explanation: string;
  answerText: string | null;
  scoringCriteria: string | null;
  isFavorite: boolean;
  choices: {
    id: string;
    problemId: string;
    label: string;
    content: string;
    isCorrect: boolean;
  }[];
  subject: { id: string; name: string; color: string };
};

export async function generateProblems(
  values: ProblemGenerationFormValues,
): Promise<{ error?: string } | GenerationErrorPayload> {
  const user = await requireCurrentUser();
  // Server-authoritative validation (client can be bypassed / the action called
  // directly). safeParse → a clear message instead of a prod-masked ZodError.
  // Zod handles 문자열 숫자(coerce)·소수(int)·0·음수(min)·과도한 수(max) in one step.
  const validation = problemGenerationFormSchema.safeParse(values);
  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
    };
  }
  const parsed = validation.data;

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
  const { subjectName, unitName, gradeName, schoolLevelName, curriculumLabel } =
    resolved.value;

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

  const basePrompt = buildProblemGenerationPrompt({
    subjectName,
    unit: unitName ?? undefined,
    difficulty: parsed.difficulty,
    type: parsed.type,
    count: parsed.count,
    gradeName,
    schoolLevelName,
    curriculumLabel,
  });
  // Generate in the user's UI language (§16); math stays standard LaTeX (§17).
  const localeLine = problemLocaleInstruction(await getServerLocale(user.locale));
  const prompt = localeLine ? `${basePrompt}\n\n${localeLine}` : basePrompt;

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
          ...generationBudgetFor(parsed.count),
        }),
    ));
  } catch (err) {
    // Plan-limit / rate rejections are expected outcomes — return a structured
    // payload (with upgrade info) so it survives to the client (thrown Server
    // Action errors are masked in production).
    const payload = generationErrorPayload(err);
    if (payload) return payload;
    // AI failures (rate limit, invalid key/account, overload, bad response): also
    // return an accurate message instead of throwing (which prod masks to a
    // generic "실패"). e.g. an invalid GEMINI_API_KEY now reads as an auth/config
    // problem, not a transient one.
    const aiPayload = aiErrorResult(err);
    if (aiPayload) return { error: aiPayload.error };
    throw err;
  }

  // Drop any SHORT_ANSWER item the AI produced without a reference answer
  // (features/problems/validate-generated.ts) — never persist an ungradable
  // problem. MULTIPLE_CHOICE/ESSAY are unaffected (grade from choices/
  // selfCorrect, not answerText).
  const { kept: gradableProblems, droppedCount: ungradableCount } =
    filterUngradableAnswers(problems, parsed.type);
  if (gradableProblems.length === 0) {
    return { error: "AI가 정답이 포함된 문제를 만들지 못했어요. 다시 시도해주세요." };
  }
  if (ungradableCount > 0) problems = gradableProblems;

  // First-pass duplicate guard (features/problems/dedup.ts): drop any
  // generated problem whose normalized prompt text exactly matches one this
  // user already has in the same subject/unit. Scoped to the same
  // subject+unit only — comparing across unrelated units would just waste
  // the check.
  const existing = await prisma.problem.findMany({
    where: { userId: user.id, subjectId: subject.id, unit: unitName },
    select: { prompt: true },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  const { kept: dedupedProblems, duplicateCount } = filterDuplicateProblems(
    problems,
    existing.map((p) => p.prompt),
  );
  if (dedupedProblems.length === 0) {
    return { error: "이미 같은 문제가 있어요. 다시 시도해주세요." };
  }
  if (duplicateCount > 0) problems = dedupedProblems;

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
        grade: gradeName,
        prompt: problem.prompt,
        explanation: problem.explanation,
        answerText: problem.answerText || null,
        scoringCriteria: problem.scoringCriteria || null,
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
  // New problems must also show up in the 문제은행 list immediately.
  revalidatePath("/study-bank");
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
  // Keep the 문제은행 "저장" tab / star state in sync without a manual refresh.
  revalidatePath("/study-bank");
}

/**
 * Generate and save one new problem that practices the same skill as a bank
 * problem. Shared imported problems are readable here, but the generated
 * problem is always stored under the requesting user's account.
 */
export async function generateSimilarProblem(
  problemId: string,
): Promise<{ error?: string; problem?: SimilarProblemResult }> {
  const user = await requireCurrentUser();
  const source = await prisma.problem.findFirst({
    where: {
      id: problemId,
      OR: [{ userId: user.id }, { source: IMPORT_SOURCE }],
    },
    include: { choices: true, subject: true },
  });
  if (!source) return { error: "문제를 찾을 수 없습니다." };

  const subjectName = source.subject?.name ?? "일반 학습";
  const basePrompt = buildSimilarProblemPrompt({
    subjectName,
    unit: source.unit,
    difficulty: source.difficulty as Difficulty,
    type: source.type as QuestionType,
    originalPrompt: source.prompt,
    gradeName: source.grade,
  });
  const localeLine = problemLocaleInstruction(await getServerLocale(user.locale));
  const prompt = localeLine ? `${basePrompt}\n\n${localeLine}` : basePrompt;
  const ip = getClientIp(await headers());

  let generated;
  try {
    ({ problems: generated } = await withGenerationQuota(
      {
        userId: user.id,
        timezone: user.timezone,
        ip,
        kind: "problem",
        count: 1,
        state: accessStateFor(user),
        trialStartedAt: trialStartedDate(user),
      },
      async () =>
        generateStructured({
          system: await getActivePromptContent(PROMPT_TYPES.PROBLEM_GENERATION),
          prompt,
          schema: aiProblemSetSchema,
          ...generationBudgetFor(1),
        }),
    ));
  } catch (err) {
    const payload = generationErrorPayload(err);
    if (payload) return payload;
    const aiPayload = aiErrorResult(err);
    if (aiPayload) return { error: aiPayload.error };
    throw err;
  }

  const problem = generated[0];
  if (!problem) return { error: "유사 문제를 만들지 못했어요. 다시 시도해주세요." };
  // Same ungradable-answer guard as generateProblems() — a SHORT_ANSWER regen
  // with no reference answer must not be persisted (see validate-generated.ts).
  if (filterUngradableAnswers([problem], source.type).kept.length === 0) {
    return { error: "AI가 정답이 포함된 문제를 만들지 못했어요. 다시 시도해주세요." };
  }

  try {
    const persisted = await prisma.$transaction(async (tx) => {
      const ownSubject = await tx.subject.upsert({
        where: { userId_name: { userId: user.id, name: subjectName } },
        create: {
          userId: user.id,
          name: subjectName,
          color: source.subject?.color ?? SUBJECT_COLOR_PALETTE[0],
        },
        update: {},
        select: { id: true, name: true, color: true },
      });

      const problemSet = await tx.problemSet.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          subjectId: ownSubject.id,
          title: `${subjectName} · 유사 문제`,
          unit: source.unit,
          difficulty: source.difficulty,
        },
      });
      const createdProblem = await tx.problem.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          problemSetId: problemSet.id,
          subjectId: ownSubject.id,
          type: source.type,
          difficulty: source.difficulty,
          unit: source.unit,
          // Inherited, not re-resolved: a similar-problem regen has no grade
          // selection of its own, so it carries the source problem's grade
          // forward (null for problems generated before this field existed).
          grade: source.grade,
          prompt: problem.prompt,
          explanation: problem.explanation,
          answerText: problem.answerText || null,
          scoringCriteria: problem.scoringCriteria || null,
          isFavorite: false,
        },
      });

      if (problem.choices?.length) {
        await tx.choice.createMany({
          data: problem.choices.map((choice) => ({
            id: randomUUID(),
            problemId: createdProblem.id,
            label: choice.label,
            content: choice.content,
            isCorrect: choice.isCorrect,
          })),
        });
      }

      const choices = await tx.choice.findMany({
        where: { problemId: createdProblem.id },
        orderBy: { id: "asc" },
      });
      return { problemSet, createdProblem, choices, subject: ownSubject };
    });

    revalidatePath("/problems");
    revalidatePath("/study-bank");

    return {
      problem: {
        id: persisted.createdProblem.id,
        userId: user.id,
        problemSetId: persisted.problemSet.id,
        subjectId: persisted.subject.id,
        type: persisted.createdProblem.type,
        difficulty: persisted.createdProblem.difficulty,
        unit: persisted.createdProblem.unit,
        prompt: persisted.createdProblem.prompt,
        explanation: persisted.createdProblem.explanation ?? "",
        answerText: persisted.createdProblem.answerText,
        scoringCriteria: persisted.createdProblem.scoringCriteria,
        isFavorite: persisted.createdProblem.isFavorite,
        choices: persisted.choices,
        subject: persisted.subject,
      },
    };
  } catch (err) {
    console.error("similar problem persistence failed:", err);
    return { error: "유사 문제를 저장하지 못했어요. 잠시 후 다시 시도해주세요." };
  }
}

/** Remove a generated similar problem after explicit user confirmation. */
export async function discardSimilarProblem(
  problemId: string,
  problemSetId: string,
): Promise<{ error?: string }> {
  const user = await requireCurrentUser();

  try {
    await prisma.$transaction(async (tx) => {
      const problem = await tx.problem.findFirst({
        where: { id: problemId, problemSetId, userId: user.id },
        select: { id: true },
      });
      if (!problem) return;

      await tx.problem.delete({ where: { id: problem.id } });
      if ((await tx.problem.count({ where: { problemSetId } })) === 0) {
        await tx.problemSet.deleteMany({ where: { id: problemSetId, userId: user.id } });
      }
    });
  } catch (err) {
    console.error("similar problem discard failed:", err);
    return { error: "유사 문제를 버리지 못했어요. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/problems");
  revalidatePath("/study-bank");
  return {};
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
  // Keep the 문제은행 list in sync after a delete (it reads live from the DB).
  revalidatePath("/study-bank");
}

/**
 * Grades one attempt at a problem. Used both for first attempts on /problems
 * and for retries on /review — a correct retry resolves the matching
 * WrongAnswer row instead of leaving it duplicated.
 */
export async function submitProblemAnswer(
  problemId: string,
  answer: { choiceId?: string; text?: string; selfCorrect?: boolean },
  opts?: {
    source?: Extract<AttemptSource, "practice" | "review">;
    durationMs?: number;
    /** In-page review re-solve: defer the SRS advance to the explicit grade
     * (다시/어려움/보통/쉬움) the user picks next, instead of auto-advancing. */
    deferReviewGrade?: boolean;
  },
): Promise<{ correct: boolean; explanation: string | null }> {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  // Solvable if it is the user's OWN problem OR a shared imported bank problem
  // (source = "import"). The attempt/wrong-answer are still recorded under the
  // SOLVING user, so shared problems flow through the normal Learning-OS path.
  const { data: problem } = await supabase
    .from("Problem")
    .select("*, choices:Choice(*), subject:Subject(name)")
    .eq("id", problemId)
    .or(`userId.eq.${user.id},source.eq.${IMPORT_SOURCE}`)
    .maybeSingle();
  if (!problem) throw new Error("문제를 찾을 수 없습니다.");

  // Attribute the attempt to the SOLVING user's own subject. For an owned
  // problem that's already problem.subjectId; for a SHARED (imported) problem it
  // belongs to the import account, so map it onto the solver's own Subject row of
  // the same canonical name (upsert) — otherwise weakness/stats would split the
  // attempt out under a subjectId the user doesn't own ("미지정 과목").
  let attemptSubjectId = problem.subjectId ?? null;
  const subjectName = (problem.subject as { name?: string } | null)?.name;
  if (problem.userId !== user.id && subjectName) {
    const color = DEFAULT_SUBJECTS.find((s) => s.name === subjectName)?.color;
    const ownSubject = await prisma.subject.upsert({
      where: { userId_name: { userId: user.id, name: subjectName } },
      create: {
        userId: user.id,
        name: subjectName,
        color: color ?? SUBJECT_COLOR_PALETTE[0],
      },
      update: {},
      select: { id: true },
    });
    attemptSubjectId = ownSubject.id;
  }

  // Server-authoritative grading — see grading.ts for why this is the only
  // place "correct" gets decided (never trusts anything the client claims).
  const { correct, userAnswerText } = gradeAnswer(problem, answer);

  // Log every attempt (correct or wrong) to the learning data foundation.
  await recordProblemAttempt({
    userId: user.id,
    problemId,
    subjectId: attemptSubjectId,
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
    // The in-page review card defers the advance to the user's explicit grade
    // (다시/어려움/보통/쉬움); every other path auto-advances with a neutral
    // "good" so behaviour there is unchanged.
    if (!opts?.deferReviewGrade) {
      await recordReviewSuccess(user.id, problemId);
    }
  } else {
    await registerWrongAnswerForReview(user.id, problemId, "problem");
  }

  revalidatePath("/problems");
  revalidatePath("/review");
  return { correct, explanation: problem.explanation };
}
