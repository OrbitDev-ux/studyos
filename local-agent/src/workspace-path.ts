import path from "node:path";
import { realpath, stat } from "node:fs/promises";

export class WorkspaceEscapeError extends Error {
  constructor() {
    super("WORKSPACE_ESCAPE");
  }
}

/**
 * String-level normalization/rejection (§8) — intentionally kept in the same
 * shape as the Web side's features/dev/workspace-path.ts (both independently
 * unit-tested; duplicated because this runs on a completely different
 * machine, not imported from the web app). This alone stops `../` traversal
 * and absolute/drive/scheme paths, but NOT a symlink planted inside the
 * workspace that points outside it — see resolveInWorkspace below for that.
 */
export function resolveWorkspaceRelativePath(input: string): string | null {
  if (typeof input !== "string" || input.length === 0) return null;
  if (input.includes("\0")) return null;
  if (input.trim().length === 0) return null;

  const normalized = input.replace(/\\/g, "/");
  if (normalized.startsWith("/")) return null;
  if (/^[a-zA-Z]:/.test(normalized)) return null;
  if (/^[a-zA-Z]+:\/\//.test(normalized)) return null;

  const resolved: string[] = [];
  for (const segment of normalized.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (resolved.length === 0) return null;
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join("/");
}

/**
 * Resolves a workspace-relative path to a REAL absolute path, verified to be
 * strictly inside the workspace root using canonical (symlink-resolved)
 * paths (§8: "symlink escape도 방지한다. 반드시 canonical/real path 검증을
 * 사용한다"). Works even for a path that doesn't exist yet (file/dir
 * creation): it realpath()s the nearest EXISTING ancestor, then re-appends
 * the not-yet-created remainder onto that canonical prefix, so a symlinked
 * ancestor directory can't be used to escape into a not-yet-materialized
 * child path either.
 *
 * `workspaceRoot` itself must already exist (workspaces are only ever added
 * via local-config.ts's addWorkspace, which already requires this).
 */
export async function resolveInWorkspace(workspaceRoot: string, relativePath: string): Promise<string> {
  const rootReal = await realpath(workspaceRoot).catch(() => {
    throw new WorkspaceEscapeError();
  });

  // Empty string means "the workspace root itself" (e.g. listing the top
  // level) — resolveWorkspaceRelativePath rejects "" as invalid INPUT, which
  // is correct for a user-supplied path but wrong here, so it's special-cased
  // before that check rather than loosening the string-level guard itself.
  if (relativePath === "") return rootReal;

  const safeRelative = resolveWorkspaceRelativePath(relativePath);
  if (safeRelative === null) throw new WorkspaceEscapeError();

  const candidate = path.join(rootReal, safeRelative);

  const remainder: string[] = [];
  let probe = candidate;
  // Walk up until we find a segment that actually exists — worst case that's
  // rootReal itself, which we already confirmed exists above.
  for (;;) {
    try {
      await stat(probe);
      break;
    } catch {
      remainder.unshift(path.basename(probe));
      const parent = path.dirname(probe);
      if (parent === probe) throw new WorkspaceEscapeError(); // reached filesystem root without a hit
      probe = parent;
    }
  }

  const existingReal = await realpath(probe);
  const finalPath = remainder.length > 0 ? path.join(existingReal, ...remainder) : existingReal;

  if (finalPath !== rootReal && !finalPath.startsWith(rootReal + path.sep)) {
    throw new WorkspaceEscapeError();
  }
  return finalPath;
}
