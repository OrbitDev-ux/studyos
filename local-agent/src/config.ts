import os from "node:os";
import path from "node:path";

/** All config-driven so a new limit/default is a one-line change here, same
 * convention as the StudyOS Web side (features/dev/agent-config.ts). */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  /** StudyOS Web's public origin — where pairing/heartbeat/verify-session
   * requests go. Overridable for local development against a non-prod app. */
  studyosUrl: (process.env.STUDYOS_URL ?? "https://studyos.app").replace(/\/+$/, ""),

  /** Loopback port the agent listens on. The browser (same machine) reads
   * this back from the device's last heartbeat, never guesses it. */
  port: envInt("STUDYOS_DEV_AGENT_PORT", 4739),

  /** Only these origins may call the agent's HTTP/WS server (§14 defense in
   * depth beyond the session-token check). Comma-separated env override for
   * self-hosted/staging deployments. */
  allowedOrigins: (process.env.STUDYOS_DEV_AGENT_ORIGINS ?? "https://studyos.app,http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  heartbeatIntervalMs: envInt("STUDYOS_DEV_AGENT_HEARTBEAT_MS", 20_000),

  /** How long a verified browser session stays cached in memory before the
   * agent requires a fresh one from the browser (which mints a new one via
   * StudyOS Web well before this — see features/dev/agent-client.ts). */
  sessionCacheTtlMs: envInt("STUDYOS_DEV_AGENT_SESSION_CACHE_MS", 15 * 60_000),

  maxFileBytes: envInt("STUDYOS_DEV_AGENT_MAX_FILE_BYTES", 1024 * 1024), // §12: 1 MiB
  maxConcurrentTerminals: envInt("STUDYOS_DEV_AGENT_MAX_TERMINALS", 8),
  terminalIdleTimeoutMs: envInt("STUDYOS_DEV_AGENT_TERMINAL_IDLE_MS", 60 * 60_000),
  processTimeoutMs: envInt("STUDYOS_DEV_AGENT_PROCESS_TIMEOUT_MS", 30 * 60_000),
  terminalOutputRateBytesPerSec: envInt("STUDYOS_DEV_AGENT_TERMINAL_OUTPUT_RATE", 200_000),
  terminalBufferHardCapBytes: envInt("STUDYOS_DEV_AGENT_TERMINAL_BUFFER_CAP", 5_000_000),

  /** Where per-machine state lives — device id/secret reference, workspace
   * list, local audit log. Never the workspace contents themselves. */
  homeDir: path.join(os.homedir(), ".studyos-dev"),
} as const;

export const CONFIG_FILE = path.join(config.homeDir, "config.json");
export const AUDIT_LOG_FILE = path.join(config.homeDir, "audit.log");
