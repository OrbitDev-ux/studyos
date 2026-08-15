import { runtimeClient } from "@/features/dev/runtime-client-core";
import type { WorkspaceStatus } from "@/features/dev/config";
import type {
  ContainerManager,
  ContainerManagerResult,
} from "@/features/dev/unavailable-container-manager";

/**
 * The REAL implementation of `ContainerManager` (§5/§6) — calls the separate
 * Dev Runtime Backend over HTTPS. Selected automatically by container-
 * manager.ts when `DEV_RUNTIME_URL` is set; every method here has the exact
 * same signature as `UnavailableContainerManager`, so no caller changes.
 * Imports the pure `runtime-client-core` (not the "server-only"-guarded
 * `runtime-client.ts`) so this class is directly unit-testable with a mocked
 * `fetch` — the guard still applies at the real entry point, container-
 * manager.ts, which only ever runs server-side.
 */
export class RemoteContainerManager implements ContainerManager {
  async ensureContainer(workspaceId: string): Promise<ContainerManagerResult> {
    const res = await runtimeClient.post<{ status: WorkspaceStatus; containerId: string }>(
      `/containers/${workspaceId}/ensure`,
    );
    if (!res.ok) return { ok: false, code: "BACKEND_UNAVAILABLE", message: res.error };
    return { ok: true, status: res.data.status, containerId: res.data.containerId };
  }

  async start(workspaceId: string): Promise<ContainerManagerResult> {
    const res = await runtimeClient.post<{ status: WorkspaceStatus }>(`/containers/${workspaceId}/start`);
    if (!res.ok) return { ok: false, code: "BACKEND_UNAVAILABLE", message: res.error };
    return { ok: true, status: res.data.status };
  }

  async stop(workspaceId: string): Promise<ContainerManagerResult> {
    const res = await runtimeClient.post<{ status: WorkspaceStatus }>(`/containers/${workspaceId}/stop`);
    if (!res.ok) return { ok: false, code: "BACKEND_UNAVAILABLE", message: res.error };
    return { ok: true, status: res.data.status };
  }

  async restart(workspaceId: string): Promise<ContainerManagerResult> {
    const res = await runtimeClient.post<{ status: WorkspaceStatus }>(`/containers/${workspaceId}/restart`);
    if (!res.ok) return { ok: false, code: "BACKEND_UNAVAILABLE", message: res.error };
    return { ok: true, status: res.data.status };
  }

  async destroy(workspaceId: string): Promise<ContainerManagerResult> {
    const res = await runtimeClient.delete<Record<string, never>>(`/containers/${workspaceId}`);
    if (!res.ok) return { ok: false, code: "BACKEND_UNAVAILABLE", message: res.error };
    return { ok: true, status: "STOPPED" };
  }
}
