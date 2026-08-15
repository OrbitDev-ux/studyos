/**
 * Path-safety guard for the (future) Files/Terminal/IDE filesystem APIs. Pure
 * and dependency-free so it's fully unit-testable independent of any real
 * filesystem or container backend — the guard exists and is verified BEFORE
 * a filesystem is ever wired up (§18, §38: path traversal prevention).
 *
 * Every user-supplied path must resolve to a location strictly inside
 * `/workspace`. This normalizes `..` segments itself (no reliance on
 * `path.resolve`/`path.normalize`, which follow OS conventions the caller
 * might not expect) and rejects anything that could otherwise escape.
 */

/** Resolves a user-supplied relative path against the workspace root.
 * Returns the normalized, workspace-relative path (posix segments joined by
 * "/", no leading slash) or `null` if the path is unsafe. */
export function resolveWorkspaceRelativePath(input: string): string | null {
  if (typeof input !== "string" || input.length === 0) return null;
  if (input.includes("\0")) return null; // null-byte injection
  if (input.trim().length === 0) return null;

  // Normalize Windows-style separators (backslash traversal tricks) too.
  const normalized = input.replace(/\\/g, "/");
  if (normalized.startsWith("/")) return null; // absolute path
  if (/^[a-zA-Z]:/.test(normalized)) return null; // Windows drive path
  if (/^[a-zA-Z]+:\/\//.test(normalized)) return null; // scheme (file://, etc.)

  const resolved: string[] = [];
  for (const segment of normalized.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      // Attempting to climb above the workspace root — reject outright rather
      // than silently clamping (clamping can mask a real attack in logs).
      if (resolved.length === 0) return null;
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join("/");
}

/** True if `input` resolves to a path strictly inside the workspace. */
export function isPathWithinWorkspace(input: string): boolean {
  return resolveWorkspaceRelativePath(input) !== null;
}

/** Absolute in-container path for a workspace-relative path, once a real
 * filesystem backend exists. Never call with an unvalidated `relativePath`. */
export function toContainerPath(relativePath: string): string {
  return relativePath === "" ? "/workspace" : `/workspace/${relativePath}`;
}
