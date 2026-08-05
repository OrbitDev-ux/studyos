import { getZonedDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export function getTodayTodos(userId: string, timezone: string) {
  return prisma.todo.findMany({
    where: { userId, dueDate: getZonedDateOnly(timezone) },
    include: { subject: true },
    orderBy: [{ completed: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
}
