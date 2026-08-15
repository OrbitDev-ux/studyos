import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Docker from "dockerode";
import { DockerContainerManager } from "../src/docker/container-manager.js";
import { execCapture } from "../src/docker/exec.js";
import { containerNameFor, volumeNameFor } from "../src/docker/naming.js";

/**
 * Docker-integration tier (§34) — distinct from the pure unit tests above.
 * Requires a reachable Docker daemon AND the `studyos-dev-sandbox:latest`
 * image (see README.md "Setup"). Each test calls `ctx.skip()` at runtime if
 * either prerequisite is missing — NOT a module-load-time `it`/`it.skip`
 * choice, which doesn't work here since availability is only known after
 * `beforeAll`'s async check runs (module-load-time selection would always
 * see the pre-beforeAll `false` defaults and skip everything unconditionally
 * — caught by testing this against a real daemon, not merely reasoned about).
 * Skips are reported explicitly, never silently reported as a pass.
 */
const docker = new Docker();
let daemonReachable = false;
let imageAvailable = false;

beforeAll(async () => {
  try {
    await docker.ping();
    daemonReachable = true;
  } catch {
    daemonReachable = false;
  }
  if (daemonReachable) {
    try {
      await docker.getImage("studyos-dev-sandbox:latest").inspect();
      imageAvailable = true;
    } catch {
      imageAvailable = false;
    }
  }
});

const WORKSPACE_ID = "vitest-integration-ws";

function skipIfUnavailable(ctx: { skip: () => never }) {
  if (!daemonReachable) {
    ctx.skip();
  } else if (!imageAvailable) {
    ctx.skip();
  }
}

describe("DockerContainerManager (real Docker)", () => {
  it("creates a real, resource-limited, non-privileged container", async (ctx) => {
    skipIfUnavailable(ctx);
    const manager = new DockerContainerManager();
    const result = await manager.ensureContainer(WORKSPACE_ID);
    expect(result.status).toBe("RUNNING");

    const info = await docker.getContainer(containerNameFor(WORKSPACE_ID)).inspect();
    expect(info.HostConfig.Privileged).toBe(false);
    expect(info.HostConfig.CapDrop).toEqual(["ALL"]);
    expect(info.HostConfig.NetworkMode).not.toBe("host");
    expect(info.HostConfig.PidsLimit).toBeGreaterThan(0);
    expect(info.HostConfig.Binds).toEqual([expect.stringContaining("/workspace")]);
  }, 30_000);

  it("runs a real command inside the container and captures real output", async (ctx) => {
    skipIfUnavailable(ctx);
    const result = await execCapture(docker, containerNameFor(WORKSPACE_ID), ["sh", "-c", 'echo "StudyOS"']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("StudyOS");
  });

  it("has no Docker socket exposed inside the container (§8)", async (ctx) => {
    skipIfUnavailable(ctx);
    const result = await execCapture(docker, containerNameFor(WORKSPACE_ID), [
      "sh",
      "-c",
      "test -S /var/run/docker.sock && echo EXPOSED || echo SAFE",
    ]);
    expect(result.stdout.trim()).toBe("SAFE");
  });

  it("runs the interactive session as a non-root user", async (ctx) => {
    skipIfUnavailable(ctx);
    const result = await execCapture(docker, containerNameFor(WORKSPACE_ID), ["whoami"]);
    expect(result.stdout.trim()).toBe("dev");
  });

  it("destroy() removes both the container and its volume", async (ctx) => {
    skipIfUnavailable(ctx);
    const manager = new DockerContainerManager();
    await manager.destroy(WORKSPACE_ID);
    await expect(docker.getContainer(containerNameFor(WORKSPACE_ID)).inspect()).rejects.toThrow();
    await expect(docker.getVolume(volumeNameFor(WORKSPACE_ID)).inspect()).rejects.toThrow();
  }, 15_000);
});

afterAll(async () => {
  if (!daemonReachable) return;
  try {
    await docker.getContainer(containerNameFor(WORKSPACE_ID)).remove({ force: true });
  } catch {
    // Already gone — fine.
  }
  try {
    await docker.getVolume(volumeNameFor(WORKSPACE_ID)).remove();
  } catch {
    // Already gone — fine.
  }
});
