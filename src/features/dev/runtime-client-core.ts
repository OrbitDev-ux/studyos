/**
 * Thin HTTP client to the Dev Runtime Backend (§2/§3 — a separate service;
 * StudyOS Web never runs Docker itself). `DEV_RUNTIME_URL` unset = no backend
 * configured, matching v1's honest default (UnavailableContainerManager and
 * every runtime-backed action report BACKEND_UNAVAILABLE, never fake success).
 *
 * Pure (env + fetch only, no Next.js server-only APIs) so it's directly
 * unit-testable — `runtime-client.ts` re-exports this under the "server-only"
 * guard actions actually import, mirroring the container-manager.ts split.
 */
function baseUrl(): string | null {
  const url = process.env.DEV_RUNTIME_URL;
  return url ? url.replace(/\/+$/, "") : null;
}

export function isRuntimeConfigured(): boolean {
  return !!baseUrl();
}

/** wss://… derived from DEV_RUNTIME_URL unless DEV_RUNTIME_WS_URL overrides it
 * (e.g. if the WS endpoint sits behind a different host/load balancer). */
export function runtimeWsBaseUrl(): string | null {
  if (process.env.DEV_RUNTIME_WS_URL) return process.env.DEV_RUNTIME_WS_URL.replace(/\/+$/, "");
  const http = baseUrl();
  if (!http) return null;
  return http.replace(/^http/, "ws");
}

export type RuntimeResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function request<T>(method: string, path: string, body?: unknown): Promise<RuntimeResult<T>> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, status: 503, error: "No dev runtime backend is configured for this deployment yet." };
  }
  const token = process.env.DEV_RUNTIME_SERVICE_TOKEN ?? "";
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = (json as { error?: { message?: string } })?.error?.message ?? "Runtime request failed.";
      return { ok: false, status: res.status, error: message };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 502, error: "Could not reach the dev runtime backend." };
  }
}

export const runtimeClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
