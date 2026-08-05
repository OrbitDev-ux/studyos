"use server";

import { revalidatePath } from "next/cache";
import { getZonedDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { goalFormSchema, type GoalFormValues } from "@/features/goals/schema";

export async function createGoal(values: GoalFormValues) {
  const user = await requireCurrentUser();
  const parsed = goalFormSchema.parse(values);

  await prisma.goal.create({
    data: {
      userId: user.id,
      title: parsed.title,
      targetValue: parsed.targetValue,
      unit: parsed.unit,
      subjectId: parsed.subjectId || null,
      date: getZonedDateOnly(user.timezone),
    },
  });
  revalidatePath("/dashboard");
}

export async function incrementGoalProgress(goalId: string, delta: number) {
  const user = await requireCurrentUser();
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) return;

  const currentValue = Math.min(goal.targetValue, Math.max(0, goal.currentValue + delta));
  await prisma.goal.update({ where: { id: goalId }, data: { currentValue } });
  revalidatePath("/dashboard");
}

export async function deleteGoal(goalId: string) {
  const user = await requireCurrentUser();
  await prisma.goal.deleteMany({ where: { id: goalId, userId: user.id } });
  revalidatePath("/dashboard");
}
