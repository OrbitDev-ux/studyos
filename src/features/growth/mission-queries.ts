import { prisma } from "@/lib/prisma";

/** Every mission the user has created, most recently created first — the
 * `/growth` page's full mission list (both active and finished). */
export function getUserMissions(userId: string) {
  return prisma.studyMission.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Missions still open (PENDING/IN_PROGRESS) — the dashboard's compact
 * "오늘의 성장 미션" widget. */
export function getActiveMissions(userId: string) {
  return prisma.studyMission.findMany({
    where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });
}

/** A single mission, scoped to its owner — returns null (never someone else's
 * row) if it doesn't exist or belongs to another user. */
export function getOwnedMission(userId: string, missionId: string) {
  return prisma.studyMission.findFirst({ where: { id: missionId, userId } });
}
