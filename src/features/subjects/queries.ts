import { prisma } from "@/lib/prisma";

export function getSubjects(userId: string) {
  return prisma.subject.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });
}
