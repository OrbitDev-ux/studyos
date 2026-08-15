import { Router, respondJson, respondError } from "../http/router.js";
import { requireServiceAuth } from "../http/service-auth.js";
import { getLogs, listProcesses, startProcess, stopProcess } from "../process/process-manager.js";

export function registerProcessRoutes(router: Router): void {
  router.post("/processes/:workspaceId", async (req, res, params, body) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const { command } = (body ?? {}) as { command?: string };
    if (typeof command !== "string" || command.trim().length === 0) {
      respondError(res, 400, "bad_request", "command is required.");
      return;
    }
    try {
      const record = await startProcess(workspaceId, command);
      respondJson(res, 200, { process: record });
    } catch (err) {
      respondError(res, 502, "process_start_failed", (err as Error).message);
    }
  });

  router.get("/processes/:workspaceId", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    respondJson(res, 200, { processes: listProcesses(workspaceId) });
  });

  router.post("/processes/:workspaceId/:id/stop", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const id = params.id as string;
    const stopped = await stopProcess(id);
    respondJson(res, 200, { stopped });
  });

  router.post("/processes/:workspaceId/:id/restart", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const id = params.id as string;
    const existing = listProcesses(workspaceId).find((p) => p.id === id);
    if (!existing) {
      respondError(res, 404, "not_found", "No such process.");
      return;
    }
    await stopProcess(id);
    const record = await startProcess(workspaceId, existing.command);
    respondJson(res, 200, { process: record });
  });

  router.get("/processes/:workspaceId/:id/logs", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const id = params.id as string;
    const logs = getLogs(id);
    if (logs === null) {
      respondError(res, 404, "not_found", "No such process.");
      return;
    }
    respondJson(res, 200, { logs });
  });
}
