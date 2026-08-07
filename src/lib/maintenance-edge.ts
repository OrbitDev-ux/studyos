// Edge-safe maintenance reader for the middleware. The middleware runs on the
// Edge runtime and can't reach Prisma, so it reads the (public, anon-readable)
// Maintenance row over Supabase's REST endpoint. A short module-level cache
// keeps this off the hot path, and every failure fails OPEN (site stays up) so
// a Supabase blip never locks users — or admins — out.

export type MaintenanceState = {
  enabled: boolean;
  title: string | null;
  message: string | null;
};

const CACHE_TTL_MS = 30_000;
const FETCH_TIMEOUT_MS = 1500;
const OFF: MaintenanceState = { enabled: false, title: null, message: null };

let cache: { value: MaintenanceState; at: number } | null = null;

export async function getMaintenanceEdge(): Promise<MaintenanceState> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return OFF;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${url}/rest/v1/Maintenance?id=eq.singleton&select=enabled,title,message`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: controller.signal,
      },
    );
    if (!res.ok) return OFF;
    const rows = (await res.json()) as Array<{
      enabled: boolean;
      title: string | null;
      message: string | null;
    }>;
    const row = rows[0];
    const value: MaintenanceState = row
      ? { enabled: row.enabled, title: row.title, message: row.message }
      : OFF;
    cache = { value, at: now };
    return value;
  } catch {
    return OFF; // fail open
  } finally {
    clearTimeout(timer);
  }
}
