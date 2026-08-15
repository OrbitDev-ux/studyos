/**
 * Runtime Backend config — env-driven, conservative defaults (§9: "정확한
 * 제한값은 현재 StudyOS 서버 규모를 확인한 후 보수적인 기본값으로 설정"). This
 * is a v1 single small VM/host running a handful of dev containers, so limits
 * are deliberately modest; raise them only after observing real usage.
 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: envInt("PORT", 8088),

  /** Shared secret for server-to-server calls from StudyOS Web (container
   * lifecycle, filesystem, run, git, metrics). Web has already verified user
   * ownership before calling — this only proves "the caller is StudyOS Web". */
  serviceToken: process.env.DEV_RUNTIME_SERVICE_TOKEN ?? "",

  /** HMAC secret for short-lived, browser-facing capability tokens (terminal
   * WebSocket connect, preview proxy) — verified without a DB round-trip. */
  capabilitySecret: process.env.DEV_RUNTIME_CAPABILITY_SECRET ?? "",

  /** Docker image used for user workspace containers. */
  workspaceImage: process.env.DEV_WORKSPACE_IMAGE ?? "studyos-dev-sandbox:latest",

  // ── Resource limits (§9) — conservative v1 defaults, per container ──────
  cpuCount: envInt("DEV_CONTAINER_CPU", 1), // 1 vCPU
  memoryMb: envInt("DEV_CONTAINER_MEMORY_MB", 1024), // 1 GiB
  pidsLimit: envInt("DEV_CONTAINER_PIDS_LIMIT", 128), // fork-bomb backstop
  diskQuotaMb: envInt("DEV_CONTAINER_DISK_QUOTA_MB", 2048), // /workspace volume soft cap (enforced best-effort, see fs routes)

  /** Container idles out (auto-stopped) after this many minutes with no
   * terminal activity and no running process. */
  idleTimeoutMinutes: envInt("DEV_IDLE_TIMEOUT_MINUTES", 30),

  /** Hard cap on a single `run` process's wall-clock time. */
  processTimeoutSeconds: envInt("DEV_PROCESS_TIMEOUT_SECONDS", 600),

  /** Terminal output throttling (§19 — a runaway `yes`/infinite loop must not
   * take the server down). Bytes/sec forwarded to the browser per session. */
  terminalOutputRateBytesPerSec: envInt("DEV_TERMINAL_OUTPUT_RATE", 200_000),
  /** If a session's OWN internal buffer (not yet flushed) exceeds this, the
   * session is killed outright rather than let memory grow unbounded. */
  terminalBufferHardCapBytes: envInt("DEV_TERMINAL_BUFFER_CAP", 5_000_000),

  capabilityTokenTtlSeconds: envInt("DEV_CAPABILITY_TOKEN_TTL", 60),
} as const;

export function assertConfigured(): void {
  requireEnv("DEV_RUNTIME_SERVICE_TOKEN");
  requireEnv("DEV_RUNTIME_CAPABILITY_SECRET");
}
