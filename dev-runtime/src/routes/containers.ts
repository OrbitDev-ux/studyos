import { Router, respondJson, respondError } from "../http/router.js";
import { requireServiceAuth } from "../http/service-auth.js";
import { containerManager } from "../docker/container-manager.js";

export function registerContainerRoutes(router: Router): void {
  router.post("/containers/:workspaceId/ensure", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    try {
      const result = await containerManager.ensureContainer(workspaceId);
      respondJson(res, 200, result);
    } catch (err) {
      respondError(res, 502, "container_error", (err as Error).message);
    }
  });

  router.post("/containers/:workspaceId/start", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    try {
      const status = await containerManager.start(workspaceId);
      respondJson(res, 200, { status });
    } catch (err) {
      respondError(res, 502, "container_error", (err as Error).message);
    }
  });

  router.post("/containers/:workspaceId/stop", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const status = await containerManager.stop(workspaceId);
    respondJson(res, 200, { status });
  });

  router.post("/containers/:workspaceId/restart", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    try {
      const status = await containerManager.restart(workspaceId);
      respondJson(res, 200, { status });
    } catch (err) {
      respondError(res, 502, "container_error", (err as Error).message);
    }
  });

  router.delete("/containers/:workspaceId", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    await containerManager.destroy(workspaceId);
    respondJson(res, 200, {});
  });

  router.get("/containers/:workspaceId/status", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const status = await containerManager.getStatus(workspaceId);
    respondJson(res, 200, { status });
  });

  router.get("/containers/:workspaceId/metrics", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const metrics = await containerManager.getMetrics(workspaceId);
    respondJson(res, 200, { metrics });
  });
}
