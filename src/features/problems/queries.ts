import { prisma } from "@/lib/prisma";

export function getProblems(userId: string) {
  return prisma.problem.findMany({
    where: { userId },
    include: { choices: true, subject: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Small "recently added" slice for the dashboard card — not a real recommendation engine. */
export function getRecentProblems(userId: string, limit: number) {
  return prisma.problem.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
