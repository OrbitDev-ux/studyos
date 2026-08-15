import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The current user's own workspace — scoped by the `userId` UNIQUE constraint
 * itself, not a separate ownership check. There is no workspaceId route param
 * anywhere in Study OS Dev v1 (one workspace per user), so there is no id a
 * client could tamper with to reach another user's workspace/container/
 * terminal/files (§9) — the query can only ever return the caller's own row.
 */
export function getMyWorkspace(userId: string) {
  return prisma.devWorkspace.findUnique({ where: { userId } });
}

export { parseDevSettings } from "@/features/dev/schema";
