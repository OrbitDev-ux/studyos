"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import {
  createMissionFormSchema,
  type CreateMissionFormValues,
} from "@/features/growth/mission-schema";
import { ACTIVE_MISSION_STATUSES, DEFAULT_MISSION_XP_REWARD } from "@/features/growth/mission-types";
import { completeMissionManually } from "@/features/growth/mission-progress";

/**
 * User-facing Mission Server Actions. `userId` is always taken from
 * requireCurrentUser() — never from the client — and every read/write below
 * is scoped to it, so one user can never see or touch another user's
 * missions. XP amounts are never client-supplied: xpReward is always the
 * fixed DEFAULT_MISSION_XP_REWARD, and the actual grant happens inside
 * completeMissionManually/mission-progress.ts, not here.
 */

export async function createMission(values: CreateMissionFormValues) {
  const user = await requireCurrentUser();
  const parsed = createMissionFormSchema.parse(values);

  const subjectId = parsed.subjectId
    ? ((await prisma.subject.findFirst({ where: { id: parsed.subjectId, userId: user.id } }))
        ?.id ?? null)
    : null;

  await prisma.studyMission.create({
    data: {
      userId: user.id,
      title: parsed.title,
      description: parsed.description ?? null,
      type: parsed.type,
      source: "MANUAL",
      subjectId,
      targetValue: parsed.targetValue,
      dueAt: parsed.dueAt ?? null,
      xpReward: DEFAULT_MISSION_XP_REWARD,
    },
  });
  revalidatePath("/growth");
  revalidatePath("/dashboard");
}

export async function updateMission(missionId: string, values: CreateMissionFormValues) {
  const user = await requireCurrentUser();
  const parsed = createMissionFormSchema.parse(values);

  const subjectId = parsed.subjectId
    ? ((await prisma.subject.findFirst({ where: { id: parsed.subjectId, userId: user.id } }))
        ?.id ?? null)
    : null;

  // Scoped to PENDING (zero progress yet) and `type` is never written here:
  // once real activity has started counting toward currentValue, changing
  // type would misinterpret already-earned progress (e.g. minutes
  // reinterpreted as a problem count) — cancelling and recreating is the
  // supported path for that instead.
  await prisma.studyMission.updateMany({
    where: { id: missionId, userId: user.id, status: "PENDING" },
    data: {
      title: parsed.title,
      description: parsed.description ?? null,
      subjectId,
      targetValue: parsed.targetValue,
      dueAt: parsed.dueAt ?? null,
    },
  });
  revalidatePath("/growth");
  revalidatePath("/dashboard");
}

export async function completeMission(missionId: string) {
  const user = await requireCurrentUser();
  const result = await completeMissionManually(user.id, missionId, user.timezone);

  revalidatePath("/growth");
  revalidatePath("/dashboard");

  if (!result) return { error: "미션을 찾을 수 없습니다." };
  return result;
}

export async function cancelMission(missionId: string) {
  const user = await requireCurrentUser();
  // updateMany (not update) — the WHERE clause is what makes this
  // ownership-safe: a missionId belonging to another user matches zero rows
  // instead of throwing or touching their data.
  await prisma.studyMission.updateMany({
    where: { id: missionId, userId: user.id, status: { in: ACTIVE_MISSION_STATUSES } },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/growth");
  revalidatePath("/dashboard");
}
