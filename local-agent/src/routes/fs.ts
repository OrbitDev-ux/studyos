import type { ServerResponse } from "node:http";
import type { Router } from "../http/router.js";
import { respondJson, respondError } from "../http/router.js";
import { requireSession, requireWorkspace } from "../http/context.js";
import type { SessionAuthenticator } from "../session-auth.js";
import {
  listDir,
  readWorkspaceFile,
  writeWorkspaceFile,
  mkdirWorkspace,
  renameWorkspaceEntry,
  removeWorkspaceEntry,
  FileTooLargeError,
  NotFoundError,
} from "../fs-operations.js";
import { WorkspaceEscapeError } from "../workspace-path.js";
import { recordAuditEvent } from "../audit-log.js";

function fsErrorResponse(res: ServerResponse, err: unknown): void {
  if (err instanceof WorkspaceEscapeError) {
    respondError(res, 400, "WORKSPACE_ESCAPE", "Path is outside the workspace.");
  } else if (err instanceof FileTooLargeError) {
    respondError(res, 413, "FILE_TOO_LARGE", "File exceeds the size limit.");
  } else if (err instanceof NotFoundError) {
    respondError(res, 404, "FILE_NOT_FOUND", "File not found.");
  } else {
    respondError(res, 500, "FILESYSTEM_ERROR", "Filesystem operation failed.");
  }
}

export function registerFsRoutes(router: Router, auth: SessionAuthenticator): void {
  router.get("/fs/:workspaceId/list", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.read"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const url = new URL(req.url ?? "", "http://internal");
    const path = url.searchParams.get("path") ?? "";
    try {
      const entries = await listDir(workspace.path, path);
      respondJson(res, 200, { entries });
    } catch (err) {
      fsErrorResponse(res, err);
    }
  });

  router.get("/fs/:workspaceId/file", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.read"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const url = new URL(req.url ?? "", "http://internal");
    const path = url.searchParams.get("path") ?? "";
    try {
      const content = await readWorkspaceFile(workspace.path, path);
      respondJson(res, 200, { content });
    } catch (err) {
      fsErrorResponse(res, err);
    }
  });

  router.put("/fs/:workspaceId/file", async (req, res, params, body) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.write"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const { path, content } = (body ?? {}) as { path?: string; content?: string };
    if (typeof path !== "string" || typeof content !== "string") {
      respondError(res, 400, "BAD_REQUEST", "path and content are required.");
      return;
    }
    try {
      await writeWorkspaceFile(workspace.path, path, content);
      await recordAuditEvent({ tool: "file.write", action: "write", workspace: workspace.name, path, success: true });
      respondJson(res, 200, { ok: true });
    } catch (err) {
      await recordAuditEvent({
        tool: "file.write",
        action: "write",
        workspace: workspace.name,
        path,
        success: false,
        errorCode: err instanceof Error ? err.message : "FILESYSTEM_ERROR",
      });
      fsErrorResponse(res, err);
    }
  });

  router.post("/fs/:workspaceId/mkdir", async (req, res, params, body) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.write"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const { path } = (body ?? {}) as { path?: string };
    if (typeof path !== "string") {
      respondError(res, 400, "BAD_REQUEST", "path is required.");
      return;
    }
    try {
      await mkdirWorkspace(workspace.path, path);
      await recordAuditEvent({ tool: "file.mkdir", action: "mkdir", workspace: workspace.name, path, success: true });
      respondJson(res, 200, { ok: true });
    } catch (err) {
      fsErrorResponse(res, err);
    }
  });

  router.post("/fs/:workspaceId/rename", async (req, res, params, body) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.write"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const { from, to } = (body ?? {}) as { from?: string; to?: string };
    if (typeof from !== "string" || typeof to !== "string") {
      respondError(res, 400, "BAD_REQUEST", "from and to are required.");
      return;
    }
    try {
      await renameWorkspaceEntry(workspace.path, from, to);
      await recordAuditEvent({ tool: "file.rename", action: "rename", workspace: workspace.name, path: to, success: true });
      respondJson(res, 200, { ok: true });
    } catch (err) {
      fsErrorResponse(res, err);
    }
  });

  router.delete("/fs/:workspaceId/entry", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.write"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const url = new URL(req.url ?? "", "http://internal");
    const path = url.searchParams.get("path") ?? "";
    try {
      await removeWorkspaceEntry(workspace.path, path);
      await recordAuditEvent({ tool: "file.delete", action: "delete", workspace: workspace.name, path, success: true });
      respondJson(res, 200, { ok: true });
    } catch (err) {
      fsErrorResponse(res, err);
    }
  });
}
