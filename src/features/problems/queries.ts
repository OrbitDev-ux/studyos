import { prisma } from "@/lib/prisma";

export function getProblems(userId: string) {
  return prisma.problem.findMany({
    where: { userId },
    include: { choices: true, subject: true },
    orderBy: { createdAt: "desc" },
  });
}
