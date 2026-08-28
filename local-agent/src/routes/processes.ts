import type { Router } from "../http/router.js";
import { respondJson, respondError } from "../http/router.js";
import { requireSession, requireWorkspace } from "../http/context.js";
import type { SessionAuthenticator } from "../session-auth.js";
import { startProcess, listProcesses, getProcess, stopProcess } from "../process-manager.js";
import { recordAuditEvent } from "../audit-log.js";

function toRecord(p: ReturnType<typeof startProcess>) {
  return {
    id: p.id,
    command: p.command,
    status: p.status,
    startedAt: p.startedAt,
    finishedAt: p.finishedAt,
    port: null as number | null, // best-effort: no port-sniffing in v1, see docs/STUDYOS_DEV.md limitations
  };
}

export function registerProcessRoutes(router: Router, auth: SessionAuthenticator): void {
  router.post("/processes/:workspaceId", async (req, res, params, body) => {
    if (!(await requireSession(req, res, auth, "dev.preview.start"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const { command } = (body ?? {}) as { command?: string };
    if (typeof command !== "string" || command.trim().length === 0) {
      respondError(res, 400, "BAD_REQUEST", "command is required.");
      return;
    }
    const proc = startProcess(workspace.id, workspace.path, command);
    await recordAuditEvent({ tool: "process.start", action: "start", workspace: workspace.name, success: true });
    respondJson(res, 200, { process: toRecord(proc) });
  });

  router.get("/processes/:workspaceId", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.read"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    respondJson(res, 200, { processes: listProcesses(workspace.id).map(toRecord) });
  });

  router.get("/processes/:workspaceId/:id/logs", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.read"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const proc = getProcess(params.id!);
    if (!proc || proc.workspaceId !== workspace.id) {
      respondError(res, 404, "PROCESS_NOT_FOUND", "Process not found.");
      return;
    }
    respondJson(res, 200, { logs: proc.logs });
  });

  router.post("/processes/:workspaceId/:id/stop", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.preview.start"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const proc = getProcess(params.id!);
    if (!proc || proc.workspaceId !== workspace.id) {
      respondError(res, 404, "PROCESS_NOT_FOUND", "Process not found.");
      return;
    }
    stopProcess(params.id!);
    await recordAuditEvent({ tool: "process.stop", action: "stop", workspace: workspace.name, success: true });
    respondJson(res, 200, { ok: true });
  });
}
