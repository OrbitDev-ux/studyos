import "server-only";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/admin/settings";
import { activeProviderName } from "@/features/ai/providers";
import { isRuntimeConfigured, runtimeClient } from "@/features/dev/runtime-client";

/**
 * StudyOS Status Dashboard — health-check domain (admin-only, read-only,
 * stateless: nothing here is persisted, see the module doc below for why).
 *
 * Reuses existing infrastructure rather than inventing a parallel one:
 *  - Database check is the same `SELECT 1` probe system-queries.ts already
 *    used for its (now superseded) 2-state grid.
 *  - AI check reuses the existing provider selection (features/ai/providers)
 *    and the admin AI kill-switch (lib/admin/settings) — no new AI
 *    abstraction, and deliberately a CONFIG check, not a live provider call:
 *    this dashboard auto-refreshes every 30s per open tab, and a live ping
 *    multiplies with every refresh × every admin who has it open, unlike a
 *    single generation request budgeted by features/ai/generation-guard.
 *  - Dev Runtime check reuses isRuntimeConfigured()/runtimeClient
 *    (features/dev/runtime-client) — the exact same "is a backend even
 *    configured" gate every dev-runtime Server Action already checks.
 */

export type HealthStatus = "OPERATIONAL" | "DEGRADED" | "DOWN" | "UNKNOWN";

export type ServiceCategory = "core" | "ai" | "infrastructure";

/**
 * Machine-readable reason code — NEVER a pre-rendered sentence. The API
 * response carries this (safe: no internal detail), and the UI resolves it to
 * localized text via messages.status.reason (features/i18n/messages.ts), so
 * the health-check layer stays i18n-agnostic and no raw exception text ever
 * reaches a client response.
 */
export type CheckReason =
  | "ok"
  | "slow"
  | "timeout"
  | "not_configured"
  | "disabled"
  | "query_failed"
  | "unreachable"
  | "unexpected_error";

export type ServiceHealth = {
  id: string;
  category: ServiceCategory;
  /** Overall status computation treats DOWN differently for critical services. */
  critical: boolean;
  status: HealthStatus;
  /** Real measured wall-clock time for this check, in ms. Never fabricated. */
  latencyMs: number;
  reason: CheckReason;
  checkedAt: string;
};

export type SystemHealthSnapshot = {
  overall: { status: HealthStatus; checkedAt: string };
  services: ServiceHealth[];
};

const DEFAULT_TIMEOUT_MS = 3000;
// Above this, a successful check still counts as DEGRADED rather than
// OPERATIONAL — a real (if simple) SLO, not a fabricated metric: the
// THRESHOLD is a judgment call, the latency it's compared against is measured.
const SLOW_THRESHOLD_MS = 500;

type CheckOutcome = { status: "OPERATIONAL" | "DEGRADED" | "DOWN"; reason: CheckReason };

/**
 * Runs one health check with a real latency measurement, a timeout, and full
 * failure isolation — this check throwing, hanging, or timing out NEVER
 * propagates past this function, so one bad dependency can't take down the
 * whole aggregator (§11) or the whole Status API.
 *
 * - The dependency itself failing/timing out → DOWN (practically equivalent
 *   for a caller: it's not usable right now).
 * - THIS function's own check logic throwing unexpectedly (a bug in the
 *   check, not evidence about the dependency) → UNKNOWN — we genuinely
 *   couldn't determine the dependency's real state, so it must never be
 *   silently reported as OPERATIONAL (§3) or misreported as a confirmed DOWN.
 *
 * Exported for direct unit testing of this isolation behavior; not meant to
 * be called from outside this module otherwise.
 */
export async function runCheck(
  id: string,
  category: ServiceCategory,
  critical: boolean,
  check: () => Promise<CheckOutcome>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ServiceHealth> {
  const start = performance.now();
  const checkedAt = () => new Date().toISOString();

  try {
    const timeout = new Promise<CheckOutcome>((resolve) =>
      setTimeout(() => resolve({ status: "DOWN", reason: "timeout" }), timeoutMs),
    );
    const outcome = await Promise.race([check(), timeout]);
    return {
      id,
      category,
      critical,
      status: outcome.status,
      latencyMs: Math.round(performance.now() - start),
      reason: outcome.reason,
      checkedAt: checkedAt(),
    };
  } catch {
    // The check function itself threw — never let that reach the caller or
    // leak the raw error. This is "we couldn't tell", not "it's down".
    return {
      id,
      category,
      critical,
      status: "UNKNOWN",
      latencyMs: Math.round(performance.now() - start),
      reason: "unexpected_error",
      checkedAt: checkedAt(),
    };
  }
}

export async function checkWeb(): Promise<CheckOutcome> {
  // We're executing this request handler, so the web/application tier is up
  // by definition — mirrors system-queries.ts's prior `server: "ok"` logic.
  return { status: "OPERATIONAL", reason: "ok" };
}

export async function checkDatabase(): Promise<CheckOutcome> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return { status: "DOWN", reason: "query_failed" };
  }
  return { status: "OPERATIONAL", reason: "ok" };
}

export async function checkAuth(): Promise<CheckOutcome> {
  // Config-level check: if the session-signing secret is missing, every
  // authenticated request in the app is broken regardless of DB health, so
  // this is a real, distinct, meaningful signal — not a duplicate of the
  // database check.
  if (!process.env.AUTH_SECRET?.trim()) {
    return { status: "DOWN", reason: "not_configured" };
  }
  return { status: "OPERATIONAL", reason: "ok" };
}

export async function checkAi(): Promise<CheckOutcome> {
  const { aiEnabled } = await getAllSettings();
  if (!aiEnabled) return { status: "DOWN", reason: "disabled" };

  const provider = activeProviderName();
  const keyPresent =
    provider === "gemini"
      ? !!process.env.GEMINI_API_KEY?.trim()
      : !!process.env.GROQ_API_KEY?.trim();
  if (!keyPresent) return { status: "DOWN", reason: "not_configured" };

  return { status: "OPERATIONAL", reason: "ok" };
}

export async function checkDevRuntime(): Promise<CheckOutcome> {
  if (!isRuntimeConfigured()) {
    return { status: "DOWN", reason: "not_configured" };
  }
  // A real backend IS configured for this deployment — actually reach it
  // (runtimeClient.get already has its own no-base-url/network-error
  // handling; the outer runCheck() timeout still bounds the wall time).
  const result = await runtimeClient.get<unknown>("/health");
  return result.ok
    ? { status: "OPERATIONAL", reason: "ok" }
    : { status: "DOWN", reason: "unreachable" };
}

const SERVICE_CHECKS = [
  { id: "web", category: "core" as const, critical: true, check: checkWeb },
  { id: "database", category: "core" as const, critical: true, check: checkDatabase },
  { id: "auth", category: "core" as const, critical: true, check: checkAuth },
  { id: "ai", category: "ai" as const, critical: false, check: checkAi },
  { id: "dev-runtime", category: "infrastructure" as const, critical: false, check: checkDevRuntime },
];

/**
 * Overall status from individual results — an explicit policy, not string
 * sorting (§8). UNKNOWN is never silently upgraded to OPERATIONAL (§3).
 *
 *  - Any CRITICAL service DOWN            -> DOWN
 *  - Otherwise any DOWN / DEGRADED / UNKNOWN (critical or not) -> DEGRADED
 *  - Otherwise (every service OPERATIONAL) -> OPERATIONAL
 */
export function computeOverallStatus(services: ServiceHealth[]): HealthStatus {
  if (services.length === 0) return "UNKNOWN";
  if (services.some((s) => s.critical && s.status === "DOWN")) return "DOWN";
  if (services.some((s) => s.status !== "OPERATIONAL")) return "DEGRADED";
  return "OPERATIONAL";
}

/** Promotes a successful-but-slow check from OPERATIONAL to DEGRADED. Applied
 * uniformly after runCheck so individual check functions stay simple. */
function applySlowThreshold(service: ServiceHealth): ServiceHealth {
  if (service.status === "OPERATIONAL" && service.latencyMs > SLOW_THRESHOLD_MS) {
    return { ...service, status: "DEGRADED", reason: "slow" };
  }
  return service;
}

/**
 * Runs every health check in parallel (bounded by each check's own timeout,
 * so the aggregate wall time is ~max(timeouts), never their sum) and never
 * throws — each Promise.all entry is itself failure-isolated by runCheck.
 */
export async function getSystemHealth(): Promise<SystemHealthSnapshot> {
  const results = await Promise.all(
    SERVICE_CHECKS.map(({ id, category, critical, check }) => runCheck(id, category, critical, check)),
  );
  const services = results.map(applySlowThreshold);

  return {
    overall: { status: computeOverallStatus(services), checkedAt: new Date().toISOString() },
    services,
  };
}
