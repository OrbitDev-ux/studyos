"use server";

import { revalidatePath } from "next/cache";
import { getZonedDateOnly } from "@/lib/date";
import { onGoalCompleted } from "@/features/growth/hooks";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { goalFormSchema, type GoalFormValues } from "@/features/goals/schema";

export async function createGoal(values: GoalFormValues) {
  const user = await requireCurrentUser();
  const parsed = goalFormSchema.parse(values);

  const subjectId = parsed.subjectId
    ? ((await prisma.subject.findFirst({ where: { id: parsed.subjectId, userId: user.id } }))
        ?.id ?? null)
    : null;

  await prisma.goal.create({
    data: {
      userId: user.id,
      title: parsed.title,
      targetValue: parsed.targetValue,
      unit: parsed.unit,
      subjectId,
      date: getZonedDateOnly(user.timezone),
    },
  });
  revalidatePath("/dashboard");
}

export async function updateGoal(goalId: string, values: GoalFormValues) {
  const user = await requireCurrentUser();
  const parsed = goalFormSchema.parse(values);

  const subjectId = parsed.subjectId
    ? ((await prisma.subject.findFirst({ where: { id: parsed.subjectId, userId: user.id } }))
        ?.id ?? null)
    : null;

  await prisma.goal.updateMany({
    where: { id: goalId, userId: user.id },
    data: {
      title: parsed.title,
      targetValue: parsed.targetValue,
      unit: parsed.unit,
      subjectId,
    },
  });
  revalidatePath("/dashboard");
}

export async function deleteGoal(goalId: string) {
  const user = await requireCurrentUser();
  await prisma.goal.deleteMany({ where: { id: goalId, userId: user.id } });
  revalidatePath("/dashboard");
}

export async function incrementGoalProgress(goalId: string, delta: number) {
  const user = await requireCurrentUser();
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: user.id },
    select: { targetValue: true },
  });
  if (!goal) return;

  // Prisma's `increment` compiles to an atomic `SET currentValue =
  // currentValue + delta` in Postgres — unlike the previous read-then-write
  // (read goal.currentValue, clamp, write it back), two concurrent taps
  // (double-click, retry, multiple tabs) can no longer silently lose one of
  // the increments (Codebase audit: race condition).
  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: { currentValue: { increment: delta } },
    select: { currentValue: true },
  });

  // Clamp as a follow-up step, not part of the atomic increment above: even
  // if this loses a tight race with another increment, it only ever tightens
  // an already-consistent value back into [0, targetValue] — it can't cause
  // the lost-update bug the increment above just fixed.
  const clamped = Math.min(goal.targetValue, Math.max(0, updated.currentValue));
  if (clamped !== updated.currentValue) {
    await prisma.goal.update({ where: { id: goalId }, data: { currentValue: clamped } });
  }

  // Growth: +30 XP once per goal, ever. Safe to call every time the goal is
  // at-or-above target (not just "the first time it crossed") — awardXp's
  // sourceId=goalId uniqueness is what actually prevents re-awarding on a
  // later increment call against an already-completed goal.
  if (clamped >= goal.targetValue) {
    await onGoalCompleted(user.id, goalId);
  }

  revalidatePath("/dashboard");
}
