"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function startStudySession() {
  const user = await requireCurrentUser();

  const active = await prisma.studySession.findFirst({
    where: { userId: user.id, endedAt: null },
  });
  if (active) return;

  await prisma.studySession.create({
    data: { userId: user.id, startedAt: new Date() },
  });
  revalidatePath("/dashboard");
}

export async function stopStudySession() {
  const user = await requireCurrentUser();

  const active = await prisma.studySession.findFirst({
    where: { userId: user.id, endedAt: null },
  });
  if (!active) return;

  const endedAt = new Date();
  const durationSec = Math.max(
    0,
    Math.round((endedAt.getTime() - active.startedAt.getTime()) / 1000),
  );

  await prisma.studySession.update({
    where: { id: active.id },
    data: { endedAt, durationSec },
  });
  revalidatePath("/dashboard");
}
