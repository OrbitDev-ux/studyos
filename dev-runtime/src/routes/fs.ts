import { Router, respondJson, respondError } from "../http/router.js";
import type { ServerResponse } from "node:http";
import { requireServiceAuth } from "../http/service-auth.js";
import { resolveWorkspaceRelativePath } from "../fs/workspace-path.js";
import * as ops from "../fs/operations.js";

function validated(res: ServerResponse, raw: string | null): string | null {
  const resolved = resolveWorkspaceRelativePath(raw ?? "");
  if (resolved === null) {
    respondError(res, 400, "invalid_path", "Path is outside the workspace.");
    return null;
  }
  return resolved;
}

export function registerFsRoutes(router: Router): void {
  router.get("/fs/:workspaceId/list", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const url = new URL(req.url ?? "", "http://internal");
    const path = validated(res, url.searchParams.get("path"));
    if (path === null) return;
    const entries = await ops.listDir(workspaceId, path);
    respondJson(res, 200, { entries });
  });

  router.get("/fs/:workspaceId/file", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const url = new URL(req.url ?? "", "http://internal");
    const path = validated(res, url.searchParams.get("path"));
    if (path === null) return;
    try {
      const content = await ops.readFile(workspaceId, path);
      respondJson(res, 200, { content });
    } catch (err) {
      respondError(res, 404, "not_found", (err as Error).message);
    }
  });

  router.put("/fs/:workspaceId/file", async (req, res, params, body) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const { path: rawPath, content } = (body ?? {}) as { path?: string; content?: string };
    const path = validated(res, rawPath ?? null);
    if (path === null) return;
    if (typeof content !== "string") {
      respondError(res, 400, "bad_request", "content must be a string.");
      return;
    }
    try {
      await ops.writeFile(workspaceId, path, content);
      respondJson(res, 200, {});
    } catch (err) {
      respondError(res, 502, "write_failed", (err as Error).message);
    }
  });

  router.post("/fs/:workspaceId/mkdir", async (req, res, params, body) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const { path: rawPath } = (body ?? {}) as { path?: string };
    const path = validated(res, rawPath ?? null);
    if (path === null) return;
    try {
      await ops.mkdir(workspaceId, path);
      respondJson(res, 200, {});
    } catch (err) {
      respondError(res, 502, "mkdir_failed", (err as Error).message);
    }
  });

  router.post("/fs/:workspaceId/rename", async (req, res, params, body) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const { from: rawFrom, to: rawTo } = (body ?? {}) as { from?: string; to?: string };
    const from = validated(res, rawFrom ?? null);
    if (from === null) return;
    const to = validated(res, rawTo ?? null);
    if (to === null) return;
    try {
      await ops.rename(workspaceId, from, to);
      respondJson(res, 200, {});
    } catch (err) {
      respondError(res, 502, "rename_failed", (err as Error).message);
    }
  });

  router.delete("/fs/:workspaceId/entry", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const url = new URL(req.url ?? "", "http://internal");
    const path = validated(res, url.searchParams.get("path"));
    if (path === null) return;
    if (path === "") {
      respondError(res, 400, "bad_request", "Cannot delete the workspace root.");
      return;
    }
    try {
      await ops.remove(workspaceId, path);
      respondJson(res, 200, {});
    } catch (err) {
      respondError(res, 502, "delete_failed", (err as Error).message);
    }
  });
}
