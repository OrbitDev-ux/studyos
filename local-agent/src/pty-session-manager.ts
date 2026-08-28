import { randomUUID } from "node:crypto";
import pty, { type IPty } from "node-pty";
import { config } from "./config.js";

/**
 * §13/§15: a REAL PTY running the user's OWN shell, directly — there is no
 * container/exec indirection to worry about here (unlike the old dev-runtime,
 * which had to reliably kill a `docker exec` process tree). node-pty owns
 * this process directly, so `.kill()` is a normal, reliable process-group
 * kill (SIGHUP → the shell's own children get it the way closing a real
 * terminal always has).
 */
export type TerminalSession = {
  id: string;
  workspaceId: string;
  pty: IPty;
  createdAt: number;
  lastActiveAt: number;
};

export class TerminalLimitError extends Error {
  constructor() {
    super("TERMINAL_LIMIT");
  }
}

const sessions = new Map<string, TerminalSession>();

function defaultShell(): string {
  if (process.platform === "win32") return process.env.COMSPEC ?? "powershell.exe";
  return process.env.SHELL ?? "/bin/bash";
}

export function createSession(workspaceId: string, cwd: string): TerminalSession {
  if (sessions.size >= config.maxConcurrentTerminals) throw new TerminalLimitError();

  const shell = pty.spawn(defaultShell(), [], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd,
    env: process.env as Record<string, string>,
  });
  const id = randomUUID();
  const session: TerminalSession = { id, workspaceId, pty: shell, createdAt: Date.now(), lastActiveAt: Date.now() };
  sessions.set(id, session);
  return session;
}

export function removeSession(id: string): void {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);
  try {
    session.pty.kill();
  } catch {
    // Already exited — fine.
  }
}

export function sessionCount(): number {
  return sessions.size;
}

export function getSession(id: string): TerminalSession | undefined {
  return sessions.get(id);
}

/** Idle reaper (§14 — no terminal session lives forever) + a clean-shutdown
 * hook `disconnectAll` for `studyos-dev disconnect` (§28: the remote command
 * channel terminates when the user disconnects — nothing keeps running as a
 * hidden background shell after that). */
let reaper: ReturnType<typeof setInterval> | null = null;
export function startIdleReaper(): void {
  if (reaper) return;
  reaper = setInterval(() => {
    const now = Date.now();
    for (const session of sessions.values()) {
      if (now - session.lastActiveAt > config.terminalIdleTimeoutMs) removeSession(session.id);
    }
  }, 60_000);
  reaper.unref();
}

export function disconnectAllSessions(): void {
  for (const id of [...sessions.keys()]) removeSession(id);
}
