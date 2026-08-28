import type { IncomingMessage, ServerResponse } from "node:http";
import { respondError } from "./router.js";
import type { SessionAuthenticator } from "../session-auth.js";
import { getWorkspace, type WorkspaceEntry } from "../local-config.js";

export async function requireSession(
  req: IncomingMessage,
  res: ServerResponse,
  auth: SessionAuthenticator,
  scope: string,
): Promise<{ userId: string } | null> {
  const token = req.headers["x-studyos-session"];
  const sessionToken = Array.isArray(token) ? token[0] : token;
  const verified = await auth.requireScope(sessionToken, scope);
  if (!verified) {
    respondError(res, 401, "PERMISSION_DENIED", "Missing, expired, or insufficiently-scoped session.");
    return null;
  }
  return { userId: verified.userId };
}

export async function requireWorkspace(workspaceId: string, res: ServerResponse): Promise<WorkspaceEntry | null> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) {
    respondError(res, 404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
    return null;
  }
  return workspace;
}
