import { prisma } from "@/lib/prisma";
import { isGuestEmail } from "@/features/ai/quota";

export type OnboardingState = {
  /** True when the tour should auto-start (never completed/skipped yet). */
  needsTutorial: boolean;
  /** Guests get the shorter, sign-up-inviting flow. */
  isGuest: boolean;
};

/** Onboarding state for a user: whether to auto-show the tour and which flow. */
export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, tutorialCompletedAt: true },
  });
  return {
    needsTutorial: !!user && user.tutorialCompletedAt === null,
    isGuest: !!user && isGuestEmail(user.email),
  };
}
