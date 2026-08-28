"use client";

// Browser-side client for the Local Agent (§3/§17). Deliberately NOT a server
// action: StudyOS Web's own server (Vercel) cannot reach 127.0.0.1 on the
// USER's machine — only the browser running on that same machine can. Every
// function here calls the Local Agent directly over its loopback HTTP/WS
// server; the only thing that ever goes through a StudyOS Web server action
// is `createAgentSession`, which mints the short-lived token that proves this
// browser tab was authorized (§21 permission check) before the agent will do
// anything with it.
import { createAgentSession } from "@/features/dev/agent-actions";
import type { DevPermission } from "@/features/dev/agent-config";

export type AgentActionError = { error?: string; code?: string };

type CachedSession = { agentUrl: string; token: string; mintedAt: number };
const sessionCache = new Map<string, CachedSession>();
const CLIENT_SESSION_TTL_MS = 10 * 60 * 1000; // keep under the agent's own cache TTL (15m)

function cacheKey(deviceId: string, scope: DevPermission): string {
  return `${deviceId}:${scope}`;
}

async function getSession(
  deviceId: string,
  scope: DevPermission,
  fresh = false,
): Promise<CachedSession | AgentActionError> {
  const key = cacheKey(deviceId, scope);
  const cached = sessionCache.get(key);
  if (!fresh && cached && Date.now() - cached.mintedAt < CLIENT_SESSION_TTL_MS) return cached;

  const res = await createAgentSession(deviceId, scope);
  if (res.error || !res.sessionToken || !res.agentUrl) {
    return { error: res.error ?? "Local Agent에 연결할 수 없습니다.", code: res.code };
  }
  const entry: CachedSession = { agentUrl: res.agentUrl, token: res.sessionToken, mintedAt: Date.now() };
  sessionCache.set(key, entry);
  return entry;
}

function isError(v: unknown): v is AgentActionError {
  return typeof v === "object" && v !== null && "error" in v && (v as AgentActionError).error !== undefined;
}

/** Every REST call to the agent — mints/reuses a session, retries ONCE with a
 * fresh session on a 401 (covers the token having gone stale). */
async function agentRequest<T>(
  deviceId: string,
  scope: DevPermission,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<{ data?: T } & AgentActionError> {
  for (const attempt of [0, 1]) {
    const session = await getSession(deviceId, scope, attempt === 1);
    if (isError(session)) return session;

    let res: Response;
    try {
      res = await fetch(`${session.agentUrl}${path}`, {
        method: init?.method ?? "GET",
        headers: { "Content-Type": "application/json", "X-StudyOS-Session": session.token },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    } catch {
      return { error: "Local Agent가 실행 중이 아닙니다.", code: "AGENT_UNREACHABLE" };
    }

    if (res.status === 401 && attempt === 0) {
      sessionCache.delete(cacheKey(deviceId, scope));
      continue;
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = (json as { error?: { message?: string } })?.error?.message ?? "요청이 실패했습니다.";
      const code = (json as { error?: { code?: string } })?.error?.code;
      return { error: message, code };
    }
    return { data: json as T };
  }
  return { error: "요청이 실패했습니다." };
}

/** Unauthenticated liveness probe — lets the UI show "Local Agent not
 * running" (§25) before ever attempting an authenticated operation. */
export async function pingAgent(agentUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${agentUrl}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Workspaces (§8 — chosen on the user's own machine; the agent, not
// StudyOS Web, is the source of truth) ─────────────────────────────────

export type AgentWorkspace = { id: string; name: string; addedAt: string; projectType: string };

export async function listAgentWorkspaces(deviceId: string) {
  return agentRequest<{ workspaces: AgentWorkspace[] }>(deviceId, "dev.workspace.read", "/workspaces");
}

/** macOS-only native folder picker (osascript `choose folder`), §8. Falls
 * back to `addAgentWorkspacePath` on other platforms. */
export async function pickAgentWorkspace(deviceId: string) {
  return agentRequest<{ workspace: AgentWorkspace }>(deviceId, "dev.workspace.write", "/workspaces/pick", {
    method: "POST",
  });
}

export async function addAgentWorkspacePath(deviceId: string, path: string) {
  return agentRequest<{ workspace: AgentWorkspace }>(deviceId, "dev.workspace.write", "/workspaces", {
    method: "POST",
    body: { path },
  });
}

export async function removeAgentWorkspace(deviceId: string, workspaceId: string) {
  return agentRequest<{ ok: true }>(deviceId, "dev.workspace.write", `/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "DELETE",
  });
}

// ── Filesystem (§9–§12) ────────────────────────────────────────────────

export type FsEntry = { name: string; type: "file" | "dir"; size: number };

export async function listWorkspaceFiles(deviceId: string, workspaceId: string, path: string) {
  return agentRequest<{ entries: FsEntry[] }>(
    deviceId,
    "dev.workspace.read",
    `/fs/${workspaceId}/list?path=${encodeURIComponent(path)}`,
  );
}

export async function readWorkspaceFile(deviceId: string, workspaceId: string, path: string) {
  return agentRequest<{ content: string }>(
    deviceId,
    "dev.workspace.read",
    `/fs/${workspaceId}/file?path=${encodeURIComponent(path)}`,
  );
}

export async function writeWorkspaceFile(deviceId: string, workspaceId: string, path: string, content: string) {
  return agentRequest<{ ok: true }>(deviceId, "dev.workspace.write", `/fs/${workspaceId}/file`, {
    method: "PUT",
    body: { path, content },
  });
}

export async function createWorkspaceFolder(deviceId: string, workspaceId: string, path: string) {
  return agentRequest<{ ok: true }>(deviceId, "dev.workspace.write", `/fs/${workspaceId}/mkdir`, {
    method: "POST",
    body: { path },
  });
}

export async function renameWorkspaceEntry(deviceId: string, workspaceId: string, from: string, to: string) {
  return agentRequest<{ ok: true }>(deviceId, "dev.workspace.write", `/fs/${workspaceId}/rename`, {
    method: "POST",
    body: { from, to },
  });
}

export async function deleteWorkspaceEntry(deviceId: string, workspaceId: string, path: string) {
  return agentRequest<{ ok: true }>(
    deviceId,
    "dev.workspace.write",
    `/fs/${workspaceId}/entry?path=${encodeURIComponent(path)}`,
    { method: "DELETE" },
  );
}

// ── Git (§18–§19) ───────────────────────────────────────────────────────

export type GitStatus = { isRepo: boolean; branch?: string; files?: { status: string; path: string }[] };
export type GitCommit = { hash: string; author: string; date: string; message: string };

export async function getWorkspaceGitStatus(deviceId: string, workspaceId: string) {
  return agentRequest<GitStatus>(deviceId, "dev.git.read", `/git/${workspaceId}/status`);
}

export async function getWorkspaceGitDiff(deviceId: string, workspaceId: string, path?: string) {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return agentRequest<{ diff: string }>(deviceId, "dev.git.read", `/git/${workspaceId}/diff${query}`);
}

export async function getWorkspaceGitLog(deviceId: string, workspaceId: string) {
  return agentRequest<{ commits: GitCommit[] }>(deviceId, "dev.git.read", `/git/${workspaceId}/log`);
}

export async function gitAddWorkspaceFiles(deviceId: string, workspaceId: string, paths: string[]) {
  return agentRequest<{ ok: true }>(deviceId, "dev.git.write", `/git/${workspaceId}/add`, {
    method: "POST",
    body: { paths },
  });
}

export async function commitWorkspaceChanges(deviceId: string, workspaceId: string, message: string) {
  return agentRequest<{ ok: true }>(deviceId, "dev.git.write", `/git/${workspaceId}/commit`, {
    method: "POST",
    body: { message },
  });
}

// ── Processes / Preview (§17) ───────────────────────────────────────────

export type ProcessRecord = {
  id: string;
  command: string;
  status: "RUNNING" | "STOPPED" | "FAILED";
  startedAt: number;
  finishedAt: number | null;
  port: number | null;
};

export async function startWorkspaceProcess(deviceId: string, workspaceId: string, command: string) {
  return agentRequest<{ process: ProcessRecord }>(deviceId, "dev.preview.start", `/processes/${workspaceId}`, {
    method: "POST",
    body: { command },
  });
}

export async function listWorkspaceProcesses(deviceId: string, workspaceId: string) {
  return agentRequest<{ processes: ProcessRecord[] }>(deviceId, "dev.workspace.read", `/processes/${workspaceId}`);
}

export async function stopWorkspaceProcess(deviceId: string, workspaceId: string, id: string) {
  return agentRequest<{ ok: true }>(deviceId, "dev.preview.start", `/processes/${workspaceId}/${encodeURIComponent(id)}/stop`, {
    method: "POST",
  });
}

export async function getWorkspaceProcessLogs(deviceId: string, workspaceId: string, id: string) {
  return agentRequest<{ logs: string }>(deviceId, "dev.workspace.read", `/processes/${workspaceId}/${encodeURIComponent(id)}/logs`);
}

// ── Terminal (§13–§15) ──────────────────────────────────────────────────

/** Opens the WS connection directly (no server action round trip needed
 * beyond the session mint) — the terminal component owns the WebSocket
 * lifecycle itself, this just hands back what it needs to open one. */
export async function getTerminalConnection(deviceId: string, workspaceId: string) {
  const session = await getSession(deviceId, "dev.terminal.execute");
  if (isError(session)) return session;
  const wsUrl = session.agentUrl.replace(/^http/, "ws");
  return { wsUrl: `${wsUrl}/ws/terminal/${workspaceId}`, token: session.token };
}
