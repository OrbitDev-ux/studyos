"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

/**
 * Mark the onboarding tutorial finished (or skipped) for the CURRENT user. Both
 * "완료" and "건너뛰기" call this — a user should never be auto-shown the tour
 * again once they've dismissed it. Scoped to requireCurrentUser(), so a client
 * can never flip another account's state (no userId is accepted from input).
 */
export async function completeTutorial(): Promise<void> {
  const user = await requireCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { tutorialCompletedAt: new Date() },
  });
}

/**
 * Re-arm the tutorial for the current user ("튜토리얼 다시 보기"). Clears the
 * completion timestamp so the tour can be shown again on demand.
 */
export async function resetTutorial(): Promise<void> {
  const user = await requireCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { tutorialCompletedAt: null },
  });
}
