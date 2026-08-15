"use server";

import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { runtimeClient, runtimeWsBaseUrl } from "@/features/dev/runtime-client";
import { signCapabilityToken } from "@/features/dev/runtime-token";
import { resolveWorkspaceRelativePath } from "@/features/dev/workspace-path";
import { containerManager } from "@/features/dev/container-manager";
import type { DevActionError } from "@/features/dev/actions";
import type { WorkspaceStatus } from "@/features/dev/config";

/**
 * Every action below is server-to-server (Web → Runtime): `requireCurrentUser`
 * + a DB ownership lookup happens HERE, then the runtime is called with the
 * static service token (§4 — the runtime never re-implements user auth). The
 * two exceptions (terminal connect, preview connect) mint a short-lived
 * capability token for the BROWSER to use directly against the runtime —
 * still gated by the same ownership check, just proven differently (§17).
 */

type CurrentUser = Awaited<ReturnType<typeof requireCurrentUser>>;

async function requireMyWorkspace(
  user: CurrentUser,
): Promise<{ id: string; status: string } | DevActionError> {
  if (!canUseFeature(accessStateFor(user), "DEV_WORKSPACE")) {
    return { error: "Study OS Dev is not available on your current plan.", code: "ENTITLEMENT_BLOCKED" };
  }
  const workspace = await prisma.devWorkspace.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });
  if (!workspace) return { error: "Workspace를 찾을 수 없습니다.", code: "NOT_FOUND" };
  return workspace;
}

function isError(v: unknown): v is DevActionError {
  return typeof v === "object" && v !== null && ("error" in v || "code" in v);
}

function validatePath(raw: string): string | null {
  return resolveWorkspaceRelativePath(raw);
}

// ── Terminal ────────────────────────────────────────────────────────────

export type TerminalConnection = { wsUrl: string; token: string } & DevActionError;

/** Ensures the container is running, then mints a short-lived capability
 * token for the browser to open the terminal WebSocket directly (§13/§17). */
export async function getTerminalConnection(): Promise<TerminalConnection> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace as TerminalConnection;

  const wsBase = runtimeWsBaseUrl();
  if (!wsBase) {
    return { wsUrl: "", token: "", error: "No dev runtime backend is configured.", code: "BACKEND_UNAVAILABLE" };
  }

  const ensured = await containerManager.ensureContainer(workspace.id, user.id);
  if (!ensured.ok) {
    return { wsUrl: "", token: "", error: ensured.message, code: "BACKEND_UNAVAILABLE" };
  }
  await prisma.devWorkspace.update({
    where: { userId: user.id },
    data: { status: ensured.status, lastActiveAt: new Date() },
  });

  const token = signCapabilityToken(user.id, workspace.id, "terminal");
  if (!token) {
    return { wsUrl: "", token: "", error: "Runtime capability secret is not configured.", code: "BACKEND_UNAVAILABLE" };
  }
  return { wsUrl: `${wsBase}/ws/terminal`, token };
}

// ── Filesystem ──────────────────────────────────────────────────────────

export type FsEntry = { name: string; type: "file" | "dir"; size: number };

export async function listWorkspaceFiles(path: string): Promise<{ entries?: FsEntry[] } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  const safePath = validatePath(path);
  if (safePath === null) return { error: "Invalid path.", code: "NOT_FOUND" };

  const res = await runtimeClient.get<{ entries: FsEntry[] }>(
    `/fs/${workspace.id}/list?path=${encodeURIComponent(safePath)}`,
  );
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { entries: res.data.entries };
}

export async function readWorkspaceFile(path: string): Promise<{ content?: string } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  const safePath = validatePath(path);
  if (safePath === null) return { error: "Invalid path.", code: "NOT_FOUND" };

  const res = await runtimeClient.get<{ content: string }>(
    `/fs/${workspace.id}/file?path=${encodeURIComponent(safePath)}`,
  );
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { content: res.data.content };
}

export async function writeWorkspaceFile(path: string, content: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  const safePath = validatePath(path);
  if (safePath === null) return { error: "Invalid path.", code: "NOT_FOUND" };

  const res = await runtimeClient.put(`/fs/${workspace.id}/file`, { path: safePath, content });
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return {};
}

export async function createWorkspaceFolder(path: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  const safePath = validatePath(path);
  if (safePath === null) return { error: "Invalid path.", code: "NOT_FOUND" };

  const res = await runtimeClient.post(`/fs/${workspace.id}/mkdir`, { path: safePath });
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return {};
}

export async function renameWorkspaceEntry(from: string, to: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  const safeFrom = validatePath(from);
  const safeTo = validatePath(to);
  if (safeFrom === null || safeTo === null) return { error: "Invalid path.", code: "NOT_FOUND" };

  const res = await runtimeClient.post(`/fs/${workspace.id}/rename`, { from: safeFrom, to: safeTo });
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return {};
}

export async function deleteWorkspaceEntry(path: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  const safePath = validatePath(path);
  if (safePath === null) return { error: "Invalid path.", code: "NOT_FOUND" };

  const res = await runtimeClient.delete(`/fs/${workspace.id}/entry?path=${encodeURIComponent(safePath)}`);
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return {};
}

// ── Processes (Run) ─────────────────────────────────────────────────────

export type ProcessRecord = {
  id: string;
  command: string;
  status: "RUNNING" | "STOPPED" | "FAILED";
  startedAt: number;
  finishedAt: number | null;
};

export async function startWorkspaceProcess(command: string): Promise<{ process?: ProcessRecord } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  if (!command.trim()) return { error: "Command is required." };

  const res = await runtimeClient.post<{ process: ProcessRecord }>(`/processes/${workspace.id}`, { command });
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { process: res.data.process };
}

export async function listWorkspaceProcesses(): Promise<{ processes?: ProcessRecord[] } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.get<{ processes: ProcessRecord[] }>(`/processes/${workspace.id}`);
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { processes: res.data.processes };
}

export async function stopWorkspaceProcess(id: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.post(`/processes/${workspace.id}/${encodeURIComponent(id)}/stop`);
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return {};
}

export async function restartWorkspaceProcess(
  id: string,
): Promise<{ process?: ProcessRecord } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.post<{ process: ProcessRecord }>(
    `/processes/${workspace.id}/${encodeURIComponent(id)}/restart`,
  );
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { process: res.data.process };
}

export async function getWorkspaceProcessLogs(id: string): Promise<{ logs?: string } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.get<{ logs: string }>(
    `/processes/${workspace.id}/${encodeURIComponent(id)}/logs`,
  );
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { logs: res.data.logs };
}

// ── Git ─────────────────────────────────────────────────────────────────

export type GitStatus = { isRepo: boolean; branch?: string; files?: { status: string; path: string }[] };

export async function getWorkspaceGitStatus(): Promise<{ status?: GitStatus } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.get<GitStatus>(`/git/${workspace.id}/status`);
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { status: res.data };
}

export async function getWorkspaceGitDiff(path?: string): Promise<{ diff?: string } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  const query = path ? `?path=${encodeURIComponent(path)}` : "";

  const res = await runtimeClient.get<{ diff: string }>(`/git/${workspace.id}/diff${query}`);
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { diff: res.data.diff };
}

export type GitCommit = { hash: string; author: string; date: string; message: string };

export async function getWorkspaceGitLog(): Promise<{ commits?: GitCommit[] } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.get<{ commits: GitCommit[] }>(`/git/${workspace.id}/log`);
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { commits: res.data.commits };
}

export async function gitAddWorkspaceFiles(paths: string[]): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.post(`/git/${workspace.id}/add`, { paths });
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return {};
}

export async function commitWorkspaceChanges(message: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  if (!message.trim()) return { error: "Commit message is required." };

  const res = await runtimeClient.post(`/git/${workspace.id}/commit`, { message });
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return {};
}

// ── Preview ─────────────────────────────────────────────────────────────

export async function getPreviewConnection(
  port: number,
): Promise<{ previewUrl?: string } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: "Invalid port." };
  }

  const httpBase = process.env.DEV_RUNTIME_URL?.replace(/\/+$/, "");
  if (!httpBase) return { error: "No dev runtime backend is configured.", code: "BACKEND_UNAVAILABLE" };

  const token = signCapabilityToken(user.id, workspace.id, "preview");
  if (!token) return { error: "Runtime capability secret is not configured.", code: "BACKEND_UNAVAILABLE" };

  return { previewUrl: `${httpBase}/preview/${workspace.id}/${port}/?token=${encodeURIComponent(token)}` };
}

// ── Metrics ─────────────────────────────────────────────────────────────

export type WorkspaceMetrics = {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  diskUsedMb: number | null;
  processCount: number;
};

export async function getWorkspaceMetrics(): Promise<{ metrics?: WorkspaceMetrics | null } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.get<{ metrics: WorkspaceMetrics | null }>(
    `/containers/${workspace.id}/metrics`,
  );
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { metrics: res.data.metrics };
}

export async function getWorkspaceStatus(): Promise<{ status?: WorkspaceStatus } & DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await requireMyWorkspace(user);
  if (isError(workspace)) return workspace;

  const res = await runtimeClient.get<{ status: WorkspaceStatus }>(`/containers/${workspace.id}/status`);
  if (!res.ok) return { error: res.error, code: "BACKEND_UNAVAILABLE" };
  return { status: res.data.status };
}
