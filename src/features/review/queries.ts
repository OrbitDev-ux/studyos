import { prisma } from "@/lib/prisma";

export function getWrongAnswers(userId: string) {
  return prisma.wrongAnswer.findMany({
    where: { userId },
    include: { problem: { include: { choices: true, subject: true } } },
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
  });
}

export function getUnresolvedWrongAnswerCount(userId: string) {
  return prisma.wrongAnswer.count({ where: { userId, resolved: false } });
}

export function getRecentUnresolvedWrongAnswers(userId: string, limit: number) {
  return prisma.wrongAnswer.findMany({
    where: { userId, resolved: false },
    include: { problem: { include: { subject: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
