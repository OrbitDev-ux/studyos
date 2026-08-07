import { prisma } from "@/lib/prisma";

// Node-side maintenance state (server components, actions, API routes). The
// Edge middleware reads the same row over HTTP — see lib/maintenance-edge.ts.
export type MaintenanceState = {
  enabled: boolean;
  title: string | null;
  message: string | null;
};

const SINGLETON_ID = "singleton";
const CACHE_TTL_MS = 15_000;
const OFF: MaintenanceState = { enabled: false, title: null, message: null };

let cache: { value: MaintenanceState; at: number } | null = null;

export async function getMaintenance(): Promise<MaintenanceState> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const row = await prisma.maintenance.findUnique({ where: { id: SINGLETON_ID } });
    const value: MaintenanceState = {
      enabled: row?.enabled ?? false,
      title: row?.title ?? null,
      message: row?.message ?? null,
    };
    cache = { value, at: now };
    return value;
  } catch {
    // Fail open — a DB hiccup or missing row must never lock everyone out.
    return OFF;
  }
}

export function invalidateMaintenanceCache(): void {
  cache = null;
}

/** Upsert the singleton. Only the provided fields change; a toggle can leave
 * title/message untouched and vice-versa. */
export async function setMaintenance(
  input: { enabled?: boolean; title?: string | null; message?: string | null },
  updatedById?: string | null,
): Promise<MaintenanceState> {
  const row = await prisma.maintenance.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      enabled: input.enabled ?? false,
      title: input.title ?? null,
      message: input.message ?? null,
      updatedById: updatedById ?? null,
    },
    update: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.message !== undefined ? { message: input.message } : {}),
      updatedById: updatedById ?? null,
    },
  });
  invalidateMaintenanceCache();
  return { enabled: row.enabled, title: row.title, message: row.message };
}
