"use server";

import { revalidatePath } from "next/cache";
import { getZonedDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { runStudyPlan } from "@/features/planner/ai";
import {
  addPlanTasksSchema,
  studyPlanInputSchema,
  type AddPlanTasksValues,
  type StudyPlan,
  type StudyPlanInput,
} from "@/features/planner/schema";

export type GenerateStudyPlanResult = {
  plan?: StudyPlan;
  error?: string;
  code?: string;
  upgradePlan?: string | null;
};

/** Generate a personalized study plan from the user's own learning data. AI
 * output is schema-validated inside runStudyPlan before it is returned. */
export async function generateStudyPlan(
  input: StudyPlanInput,
): Promise<GenerateStudyPlanResult> {
  const user = await requireCurrentUser();
  const parsed = studyPlanInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }

  const res = await runStudyPlan(user, parsed.data);
  if (!res.ok) {
    return {
      error: "error" in res ? res.error : "학습 계획 생성에 실패했어요.",
      code: "code" in res ? res.code : undefined,
      upgradePlan: "upgradePlan" in res ? res.upgradePlan : undefined,
    };
  }
  return { plan: res.plan };
}

/**
 * Commit chosen plan tasks to the existing Todo system (today's due date). The
 * payload is re-validated here so an arbitrary body can't create todos; each
 * task's subject name is matched to the user's OWN Subject (or left unset).
 */
export async function addPlanTasksToTodos(
  values: AddPlanTasksValues,
): Promise<{ count?: number; error?: string }> {
  const user = await requireCurrentUser();
  const parsed = addPlanTasksSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "할 일 목록이 올바르지 않습니다." };
  }

  const subjects = await prisma.subject.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });
  const subjectIdByName = new Map(subjects.map((s) => [s.name, s.id]));
  const dueDate = getZonedDateOnly(user.timezone);

  await prisma.todo.createMany({
    data: parsed.data.tasks.map((task) => ({
      userId: user.id,
      title: task.title.slice(0, 200),
      subjectId: subjectIdByName.get(task.subject) ?? null,
      dueDate,
    })),
  });

  revalidatePath("/todos");
  revalidatePath("/dashboard");
  return { count: parsed.data.tasks.length };
}
