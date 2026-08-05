import { prisma } from "@/lib/prisma";

export function getWrongAnswers(userId: string) {
  return prisma.wrongAnswer.findMany({
    where: { userId },
    include: { problem: { include: { choices: true, subject: true } } },
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
  });
}
