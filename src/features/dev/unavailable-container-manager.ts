import type { WorkspaceStatus } from "@/features/dev/config";

export type ContainerManagerResult =
  | { ok: true; status: WorkspaceStatus; containerId?: string }
  | { ok: false; code: "BACKEND_UNAVAILABLE"; message: string };

/**
 * Contract a real container backend must implement: one isolated Linux
 * container per user, resource-limited (CPU/memory/PIDs/disk/timeout), no
 * privileged mode, no host network/PID namespace, no host filesystem mount,
 * no Docker socket exposure (§15/§16). StudyOS's server never runs a user's
 * shell command directly — only through this interface, which a real backend
 * implementation forwards to a container's PTY.
 *
 * StudyOS deploys to Vercel: serverless functions with no Docker daemon and no
 * long-lived process, so no container backend can run *inside* this app. A
 * real implementation is a SEPARATE always-on service (its own host, reachable
 * over HTTPS/WSS) that a future class here would call out to. v1 ships only
 * the honest `UnavailableContainerManager` below — every operation reports
 * BACKEND_UNAVAILABLE rather than pretending a container exists. No caller
 * needs to change when a real backend is plugged in.
 */
export interface ContainerManager {
  ensureContainer(workspaceId: string, userId: string): Promise<ContainerManagerResult>;
  start(workspaceId: string): Promise<ContainerManagerResult>;
  stop(workspaceId: string): Promise<ContainerManagerResult>;
  restart(workspaceId: string): Promise<ContainerManagerResult>;
  destroy(workspaceId: string): Promise<ContainerManagerResult>;
}

const UNAVAILABLE = {
  ok: false as const,
  code: "BACKEND_UNAVAILABLE" as const,
  message: "No container backend is configured for this deployment yet.",
};

/** Pure — no DB/env/IO — so it's unit-testable without the "server-only"
 * guard (kept only on the singleton export in container-manager.ts). */
export class UnavailableContainerManager implements ContainerManager {
  async ensureContainer(_workspaceId: string, _userId: string): Promise<ContainerManagerResult> {
    return UNAVAILABLE;
  }
  async start(_workspaceId: string): Promise<ContainerManagerResult> {
    return UNAVAILABLE;
  }
  async stop(_workspaceId: string): Promise<ContainerManagerResult> {
    return UNAVAILABLE;
  }
  async restart(_workspaceId: string): Promise<ContainerManagerResult> {
    return UNAVAILABLE;
  }
  async destroy(_workspaceId: string): Promise<ContainerManagerResult> {
    return UNAVAILABLE;
  }
}
