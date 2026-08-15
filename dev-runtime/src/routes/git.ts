import { Router, respondJson, respondError } from "../http/router.js";
import { requireServiceAuth } from "../http/service-auth.js";
import { docker } from "../docker/container-manager.js";
import { containerNameFor } from "../docker/naming.js";
import { execCapture } from "../docker/exec.js";
import { resolveWorkspaceRelativePath } from "../fs/workspace-path.js";

async function git(workspaceId: string, args: string[]) {
  return execCapture(docker, containerNameFor(workspaceId), ["git", ...args]);
}

function isNotARepo(stderr: string): boolean {
  return /not a git repository/i.test(stderr);
}

export function registerGitRoutes(router: Router): void {
  router.get("/git/:workspaceId/status", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const branch = await git(workspaceId, ["branch", "--show-current"]);
    if (isNotARepo(branch.stderr)) {
      respondJson(res, 200, { isRepo: false });
      return;
    }
    const status = await git(workspaceId, ["status", "--porcelain=v1"]);
    const files = status.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3) }));
    respondJson(res, 200, { isRepo: true, branch: branch.stdout.trim(), files });
  });

  router.get("/git/:workspaceId/diff", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const url = new URL(req.url ?? "", "http://internal");
    const rawPath = url.searchParams.get("path");
    const args = ["diff"];
    if (rawPath) {
      const path = resolveWorkspaceRelativePath(rawPath);
      if (path === null) {
        respondError(res, 400, "invalid_path", "Path is outside the workspace.");
        return;
      }
      args.push("--", path);
    }
    const diff = await git(workspaceId, args);
    respondJson(res, 200, { diff: diff.stdout });
  });

  router.get("/git/:workspaceId/log", async (req, res, params) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const log = await git(workspaceId, ["log", "-n", "20", "--pretty=format:%h\t%an\t%ar\t%s"]);
    const commits = log.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, ...msg] = line.split("\t");
        return { hash, author, date, message: msg.join("\t") };
      });
    respondJson(res, 200, { commits });
  });

  router.post("/git/:workspaceId/add", async (req, res, params, body) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const { paths } = (body ?? {}) as { paths?: string[] };
    if (!Array.isArray(paths) || paths.length === 0) {
      respondError(res, 400, "bad_request", "paths is required.");
      return;
    }
    const resolved: string[] = [];
    for (const p of paths) {
      const path = resolveWorkspaceRelativePath(p);
      if (path === null) {
        respondError(res, 400, "invalid_path", "Path is outside the workspace.");
        return;
      }
      resolved.push(path);
    }
    const result = await git(workspaceId, ["add", "--", ...resolved]);
    respondJson(res, result.exitCode === 0 ? 200 : 502, { ok: result.exitCode === 0, stderr: result.stderr });
  });

  router.post("/git/:workspaceId/commit", async (req, res, params, body) => {
    if (!requireServiceAuth(req, res)) return;
    const workspaceId = params.workspaceId as string;
    const { message } = (body ?? {}) as { message?: string };
    if (typeof message !== "string" || message.trim().length === 0) {
      respondError(res, 400, "bad_request", "message is required.");
      return;
    }
    const result = await git(workspaceId, ["commit", "-m", message]);
    respondJson(res, result.exitCode === 0 ? 200 : 502, { ok: result.exitCode === 0, output: result.stdout + result.stderr });
  });
}
