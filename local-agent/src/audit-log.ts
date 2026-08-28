import { appendFile, mkdir, stat, rename } from "node:fs/promises";
import { config, AUDIT_LOG_FILE } from "./config.js";

export type AuditEvent = {
  tool: string;
  action: string;
  workspace?: string;
  path?: string;
  success: boolean;
  errorCode?: string;
};

const MAX_LOG_BYTES = 5 * 1024 * 1024;

/**
 * §22: local-only audit log (kept on the user's own machine, not phoned home
 * to StudyOS — nothing here is a StudyOS server concern, since StudyOS never
 * executes or observes these operations directly). Never file content,
 * passwords, API keys, tokens, or .env contents — only the fields §22
 * explicitly allows: tool, action, workspace, path, timestamp, success.
 */
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await mkdir(config.homeDir, { recursive: true, mode: 0o700 });
    const info = await stat(AUDIT_LOG_FILE).catch(() => null);
    if (info && info.size > MAX_LOG_BYTES) {
      await rename(AUDIT_LOG_FILE, `${AUDIT_LOG_FILE}.1`).catch(() => {});
    }
    const line = `${JSON.stringify({ ...event, timestamp: new Date().toISOString() })}\n`;
    await appendFile(AUDIT_LOG_FILE, line, { encoding: "utf8", mode: 0o600 });
  } catch {
    // Audit logging must never break the actual operation it's recording.
  }
}
