import type { Router } from "../http/router.js";
import { respondJson, respondError } from "../http/router.js";
import { requireSession, requireWorkspace } from "../http/context.js";
import type { SessionAuthenticator } from "../session-auth.js";
import { gitStatus, gitDiff, gitLog, gitAdd, gitCommit, InvalidPathError, GitError } from "../git-operations.js";
import { recordAuditEvent } from "../audit-log.js";

export function registerGitRoutes(router: Router, auth: SessionAuthenticator): void {
  router.get("/git/:workspaceId/status", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.git.read"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    respondJson(res, 200, await gitStatus(workspace.path));
  });

  router.get("/git/:workspaceId/diff", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.git.read"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const url = new URL(req.url ?? "", "http://internal");
    const path = url.searchParams.get("path") ?? undefined;
    try {
      respondJson(res, 200, { diff: await gitDiff(workspace.path, path) });
    } catch (err) {
      if (err instanceof InvalidPathError) respondError(res, 400, "WORKSPACE_ESCAPE", "Path is outside the workspace.");
      else respondError(res, 502, "GIT_ERROR", "git diff failed.");
    }
  });

  router.get("/git/:workspaceId/log", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.git.read"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    respondJson(res, 200, { commits: await gitLog(workspace.path) });
  });

  router.post("/git/:workspaceId/add", async (req, res, params, body) => {
    if (!(await requireSession(req, res, auth, "dev.git.write"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const { paths } = (body ?? {}) as { paths?: string[] };
    if (!Array.isArray(paths) || paths.length === 0) {
      respondError(res, 400, "BAD_REQUEST", "paths is required.");
      return;
    }
    try {
      await gitAdd(workspace.path, paths);
      await recordAuditEvent({ tool: "git.add", action: "add", workspace: workspace.name, success: true });
      respondJson(res, 200, { ok: true });
    } catch (err) {
      if (err instanceof InvalidPathError) respondError(res, 400, "WORKSPACE_ESCAPE", "Path is outside the workspace.");
      else respondError(res, 502, "GIT_ERROR", err instanceof GitError ? err.message : "git add failed.");
    }
  });

  router.post("/git/:workspaceId/commit", async (req, res, params, body) => {
    if (!(await requireSession(req, res, auth, "dev.git.write"))) return;
    const workspace = await requireWorkspace(params.workspaceId!, res);
    if (!workspace) return;
    const { message } = (body ?? {}) as { message?: string };
    if (typeof message !== "string" || message.trim().length === 0) {
      respondError(res, 400, "BAD_REQUEST", "message is required.");
      return;
    }
    try {
      await gitCommit(workspace.path, message);
      await recordAuditEvent({ tool: "git.commit", action: "commit", workspace: workspace.name, success: true });
      respondJson(res, 200, { ok: true });
    } catch (err) {
      await recordAuditEvent({ tool: "git.commit", action: "commit", workspace: workspace.name, success: false });
      respondError(res, 502, "GIT_ERROR", err instanceof GitError ? err.message : "git commit failed.");
    }
  });
}
