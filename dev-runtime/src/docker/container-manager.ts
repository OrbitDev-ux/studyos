import Docker from "dockerode";
import { config } from "../config.js";
import { containerNameFor, volumeNameFor } from "./naming.js";
import { execCapture } from "./exec.js";

/** Mirrors WORKSPACE_STATUSES in src/features/dev/config.ts (Web side). */
export type WorkspaceStatus =
  | "NOT_PROVISIONED"
  | "CREATING"
  | "READY"
  | "RUNNING"
  | "IDLE"
  | "STOPPED"
  | "ERROR";

export type ContainerMetrics = {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  diskUsedMb: number | null;
  processCount: number;
};

export const docker = new Docker(); // defaults to DOCKER_HOST / /var/run/docker.sock

/**
 * The real container backend (§5, §6): one Docker container per workspace,
 * a named volume for /workspace (§11 — survives container recreation), and
 * a locked-down HostConfig (§8/§9): no privileged mode, no Docker socket
 * mount, no host network/PID namespace, no published ports (preview reaches
 * the container over the Docker network directly, never a host port), all
 * capabilities dropped, CPU/memory/PIDs limits, non-root user.
 */
export class DockerContainerManager {
  async ensureContainer(workspaceId: string): Promise<{ status: WorkspaceStatus; containerId: string }> {
    await this.ensureVolume(workspaceId);
    const name = containerNameFor(workspaceId);

    const existing = await this.findContainer(name);
    if (existing) {
      const info = await existing.inspect();
      if (!info.State.Running) {
        await existing.start();
      }
      return { status: "RUNNING", containerId: info.Id };
    }

    const container = await docker.createContainer({
      name,
      Image: config.workspaceImage,
      Cmd: ["sleep", "infinity"], // keep-alive; real work happens via `exec`
      WorkingDir: "/workspace",
      User: "dev",
      Labels: { "studyos.workspaceId": workspaceId },
      HostConfig: {
        Binds: [`${volumeNameFor(workspaceId)}:/workspace`],
        NanoCpus: config.cpuCount * 1_000_000_000,
        Memory: config.memoryMb * 1024 * 1024,
        MemorySwap: config.memoryMb * 1024 * 1024, // = Memory → no swap
        PidsLimit: config.pidsLimit,
        Privileged: false,
        ReadonlyRootfs: false,
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges:true"],
        NetworkMode: "bridge", // default bridge; NOT host
        PortBindings: {}, // no published ports — preview proxies over the Docker network instead
        PublishAllPorts: false,
      },
    });
    await container.start();
    return { status: "RUNNING", containerId: container.id };
  }

  async start(workspaceId: string): Promise<WorkspaceStatus> {
    const container = await this.requireContainer(workspaceId);
    const info = await container.inspect();
    if (!info.State.Running) await container.start();
    return "RUNNING";
  }

  async stop(workspaceId: string): Promise<WorkspaceStatus> {
    const container = await this.findContainer(containerNameFor(workspaceId));
    if (!container) return "NOT_PROVISIONED";
    const info = await container.inspect();
    if (info.State.Running) await container.stop({ t: 5 });
    return "STOPPED";
  }

  async restart(workspaceId: string): Promise<WorkspaceStatus> {
    const container = await this.requireContainer(workspaceId);
    await container.restart({ t: 5 });
    return "RUNNING";
  }

  /** Removes the container AND its volume — a real delete (matches
   * destroyMyWorkspace's DB row deletion on the Web side). */
  async destroy(workspaceId: string): Promise<void> {
    const container = await this.findContainer(containerNameFor(workspaceId));
    if (container) {
      await container.remove({ force: true });
    }
    try {
      await docker.getVolume(volumeNameFor(workspaceId)).remove();
    } catch {
      // Volume may not exist (workspace never started) — fine.
    }
  }

  async getStatus(workspaceId: string): Promise<WorkspaceStatus> {
    const container = await this.findContainer(containerNameFor(workspaceId));
    if (!container) return "NOT_PROVISIONED";
    const info = await container.inspect();
    return info.State.Running ? "RUNNING" : "STOPPED";
  }

  async getMetrics(workspaceId: string): Promise<ContainerMetrics | null> {
    const container = await this.findContainer(containerNameFor(workspaceId));
    if (!container) return null;
    const info = await container.inspect();
    if (!info.State.Running) return null;

    const stats = await container.stats({ stream: false });
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const onlineCpus = stats.cpu_stats.online_cpus || 1;
    const cpuPercent =
      systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;

    const memoryUsedMb = Math.round((stats.memory_stats.usage ?? 0) / 1024 / 1024);
    const memoryLimitMb = Math.round((stats.memory_stats.limit ?? 0) / 1024 / 1024);

    let diskUsedMb: number | null = null;
    try {
      const du = await execCapture(docker, containerNameFor(workspaceId), ["du", "-sm", "/workspace"], {
        timeoutMs: 5000,
      });
      const match = du.stdout.trim().match(/^(\d+)/);
      diskUsedMb = match ? Number(match[1]) : null;
    } catch {
      diskUsedMb = null; // best-effort only (§30 — never let a metrics probe crash the request)
    }

    let processCount = 0;
    try {
      const top = await container.top({});
      processCount = Array.isArray(top.Processes) ? top.Processes.length : 0;
    } catch {
      processCount = 0;
    }

    return { cpuPercent: Math.round(cpuPercent * 10) / 10, memoryUsedMb, memoryLimitMb, diskUsedMb, processCount };
  }

  private async ensureVolume(workspaceId: string): Promise<void> {
    const name = volumeNameFor(workspaceId);
    try {
      await docker.getVolume(name).inspect();
    } catch {
      await docker.createVolume({ Name: name, Labels: { "studyos.workspaceId": workspaceId } });
    }
  }

  private async findContainer(name: string): Promise<Docker.Container | null> {
    try {
      const container = docker.getContainer(name);
      await container.inspect();
      return container;
    } catch {
      return null;
    }
  }

  private async requireContainer(workspaceId: string): Promise<Docker.Container> {
    const container = await this.findContainer(containerNameFor(workspaceId));
    if (!container) throw new Error(`No container for workspace ${workspaceId} — call ensureContainer first`);
    return container;
  }
}

export const containerManager = new DockerContainerManager();
