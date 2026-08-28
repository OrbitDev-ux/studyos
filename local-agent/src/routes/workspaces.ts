import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Router } from "../http/router.js";
import { respondJson, respondError } from "../http/router.js";
import { requireSession } from "../http/context.js";
import type { SessionAuthenticator } from "../session-auth.js";
import { addWorkspace, readLocalConfig, removeWorkspace } from "../local-config.js";
import { recordAuditEvent } from "../audit-log.js";

const execFileAsync = promisify(execFile);

/** macOS-native "Choose Folder…" dialog (§8) — AppleScript's `choose folder`
 * works even when invoked from a background/terminal process, so this needs
 * no extra GUI framework dependency. Not available on Linux/Windows in v1;
 * the browser UI falls back to a typed path there (POST /workspaces). */
async function pickFolderMac(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Select a StudyOS Dev workspace folder")',
    ]);
    const p = stdout.trim();
    return p.length > 0 ? p : null;
  } catch {
    return null; // user cancelled, or osascript unavailable
  }
}

export function registerWorkspaceRoutes(router: Router, auth: SessionAuthenticator): void {
  router.get("/workspaces", async (req, res) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.read"))) return;
    const { workspaces } = await readLocalConfig();
    respondJson(res, 200, {
      workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, addedAt: w.addedAt })),
    });
  });

  router.post("/workspaces/pick", async (req, res) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.write"))) return;
    if (process.platform !== "darwin") {
      respondError(res, 400, "BAD_REQUEST", "The native folder picker is only available on macOS.");
      return;
    }
    const picked = await pickFolderMac();
    if (!picked) {
      respondError(res, 400, "BAD_REQUEST", "No folder was chosen.");
      return;
    }
    try {
      const workspace = await addWorkspace(picked);
      await recordAuditEvent({ tool: "workspace", action: "add", success: true, path: workspace.name });
      respondJson(res, 200, { workspace: { id: workspace.id, name: workspace.name, addedAt: workspace.addedAt } });
    } catch {
      await recordAuditEvent({ tool: "workspace", action: "add", success: false, errorCode: "WORKSPACE_NOT_FOUND" });
      respondError(res, 404, "WORKSPACE_NOT_FOUND", "That folder could not be found.");
    }
  });

  router.post("/workspaces", async (req, res, _params, body) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.write"))) return;
    const { path } = (body ?? {}) as { path?: string };
    if (typeof path !== "string" || path.trim().length === 0) {
      respondError(res, 400, "BAD_REQUEST", "path is required.");
      return;
    }
    try {
      const workspace = await addWorkspace(path.trim());
      await recordAuditEvent({ tool: "workspace", action: "add", success: true, path: workspace.name });
      respondJson(res, 200, { workspace: { id: workspace.id, name: workspace.name, addedAt: workspace.addedAt } });
    } catch {
      await recordAuditEvent({ tool: "workspace", action: "add", success: false, errorCode: "WORKSPACE_NOT_FOUND" });
      respondError(res, 404, "WORKSPACE_NOT_FOUND", "That folder could not be found.");
    }
  });

  router.delete("/workspaces/:id", async (req, res, params) => {
    if (!(await requireSession(req, res, auth, "dev.workspace.write"))) return;
    await removeWorkspace(params.id!);
    await recordAuditEvent({ tool: "workspace", action: "remove", success: true });
    respondJson(res, 200, { ok: true });
  });
}
