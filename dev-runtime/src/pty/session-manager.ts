import pty, { type IPty } from "node-pty";
import { containerNameFor } from "../docker/naming.js";
import { docker } from "../docker/container-manager.js";
import { execCapture } from "../docker/exec.js";
import { config } from "../config.js";

/**
 * A real PTY session: node-pty spawns the LOCAL `docker exec -it` process,
 * whose slave side is a genuine TTY inside the user's container running bash
 * (§13/§15). We never run the user's command on the runtime host itself —
 * only `docker exec -it <container> ...` is spawned locally, and everything
 * the user types goes to bash INSIDE the container.
 */
export type TerminalSession = {
  id: string;
  userId: string;
  workspaceId: string;
  pty: IPty;
  createdAt: number;
  lastActiveAt: number;
  /** Container-namespace PID of the interactive bash, captured from the
   * marker line `spawnCommand` prints as its very first output (stripped
   * before anything reaches the browser — see terminal-server.ts). Needed
   * to reliably clean up orphaned foreground jobs on disconnect — see the
   * comment on PID_MARKER below for why relying on TTY-hangup signals alone
   * does NOT work here (verified live: it leaves runaway processes behind). */
  containerPid: number | null;
};

export const PID_MARKER = "__STUDYOS_TERM_PID__:";

/**
 * IMPORTANT (verified live, not theoretical): killing the LOCAL `docker exec`
 * client process (what node-pty's `.kill()` does) does NOT reliably terminate
 * the container-side process tree — a `yes` left running by a user survived
 * session close/idle-timeout/abuse-kill in testing. Docker does not tie an
 * exec'd process's lifetime to the client connection the way one might
 * expect. So cleanup here explicitly kills the container-side process GROUP
 * by PID (captured via this marker) rather than hoping a signal propagates.
 */
function spawnCommand(containerName: string): string[] {
  return [
    "exec",
    "-it",
    "-u",
    "dev",
    "-w",
    "/workspace",
    containerName,
    "sh",
    "-c",
    `echo "${PID_MARKER}$$"; exec bash`,
  ];
}

const sessions = new Map<string, TerminalSession>();

export function createSession(userId: string, workspaceId: string): TerminalSession {
  const containerName = containerNameFor(workspaceId);
  const shell = pty.spawn("docker", spawnCommand(containerName), {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    env: process.env as Record<string, string>,
  });
  const id = `${workspaceId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const session: TerminalSession = {
    id,
    userId,
    workspaceId,
    pty: shell,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    containerPid: null,
  };
  sessions.set(id, session);
  return session;
}

export async function removeSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);

  // Explicit, deterministic cleanup of EVERY process in the container-side
  // shell SESSION — not just its own process group. Verified live that this
  // distinction matters: interactive bash job control puts each foreground
  // job (e.g. `yes`) in its OWN process group (a NEW pgid, distinct from
  // bash's), so `kill -<bashPid>` (targeting only bash's group) misses it
  // entirely and leaves it running forever. All of a session's process
  // groups share one SID (= the session-leader bash's own PID, since `docker
  // exec -it` makes it the session leader), so `pkill -s <sid>` is what
  // actually reaches every job. Best-effort: TERM first, KILL as a backstop.
  if (session.containerPid !== null) {
    const containerName = containerNameFor(session.workspaceId);
    const sid = String(session.containerPid);
    await execCapture(docker, containerName, ["pkill", "-TERM", "-s", sid]).catch(() => {});
    setTimeout(() => {
      void execCapture(docker, containerName, ["pkill", "-KILL", "-s", sid]).catch(() => {});
    }, 1500).unref();
  }

  try {
    session.pty.kill();
  } catch {
    // Already exited — fine.
  }
}

export function listSessionsForWorkspace(workspaceId: string): TerminalSession[] {
  return [...sessions.values()].filter((s) => s.workspaceId === workspaceId);
}

export function sessionCount(): number {
  return sessions.size;
}

/** Idle reaper (§18 — no terminal session lives forever). Runs once/minute. */
setInterval(() => {
  const now = Date.now();
  const idleMs = config.idleTimeoutMinutes * 60_000;
  for (const session of sessions.values()) {
    if (now - session.lastActiveAt > idleMs) void removeSession(session.id);
  }
}, 60_000).unref();
