import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { config } from "./config.js";

/** §17 Run/Dev Server manager — every command starts from an explicit user
 * click (never auto-run) and only ever runs inside a chosen workspace's own
 * directory via the shell the user already trusts on their own machine. */
export type ManagedProcess = {
  id: string;
  workspaceId: string;
  command: string;
  status: "RUNNING" | "STOPPED" | "FAILED";
  startedAt: number;
  finishedAt: number | null;
  logs: string;
  child: ChildProcess;
};

const MAX_LOG_BYTES = 200_000;
const processes = new Map<string, ManagedProcess>();

function appendLog(proc: ManagedProcess, chunk: string): void {
  proc.logs += chunk;
  if (proc.logs.length > MAX_LOG_BYTES) proc.logs = proc.logs.slice(proc.logs.length - MAX_LOG_BYTES);
}

export function startProcess(workspaceId: string, cwd: string, command: string): ManagedProcess {
  const child = spawn(command, {
    cwd,
    shell: true, // a Run command IS a shell command by design (e.g. "npm run dev"), same as a user typing it into a terminal — not user-supplied argv concatenation into some other command
    env: process.env,
  });

  const id = randomUUID();
  const proc: ManagedProcess = {
    id,
    workspaceId,
    command,
    status: "RUNNING",
    startedAt: Date.now(),
    finishedAt: null,
    logs: "",
    child,
  };
  processes.set(id, proc);

  child.stdout?.on("data", (d: Buffer) => appendLog(proc, d.toString("utf8")));
  child.stderr?.on("data", (d: Buffer) => appendLog(proc, d.toString("utf8")));
  child.on("exit", (code) => {
    proc.status = code === 0 ? "STOPPED" : "FAILED";
    proc.finishedAt = Date.now();
  });

  const timer = setTimeout(() => {
    if (proc.status === "RUNNING") stopProcess(id);
  }, config.processTimeoutMs);
  timer.unref();

  return proc;
}

export function listProcesses(workspaceId: string): ManagedProcess[] {
  return [...processes.values()].filter((p) => p.workspaceId === workspaceId);
}

export function getProcess(id: string): ManagedProcess | undefined {
  return processes.get(id);
}

export function stopProcess(id: string): boolean {
  const proc = processes.get(id);
  if (!proc || proc.status !== "RUNNING") return false;
  try {
    proc.child.kill("SIGTERM");
    setTimeout(() => {
      if (proc.status === "RUNNING") proc.child.kill("SIGKILL");
    }, 3000).unref();
  } catch {
    // Already exited.
  }
  return true;
}

export function stopAllProcesses(): void {
  for (const id of [...processes.keys()]) stopProcess(id);
}
