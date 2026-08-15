/**
 * Path-safety guard — intentionally kept byte-for-byte in sync with
 * `src/features/dev/workspace-path.ts` on the Web side (§12). Duplicated
 * rather than shared because dev-runtime is a separately deployed service;
 * both copies are independently unit-tested (see test/workspace-path.test.ts
 * here and the Web side's own test file).
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

export function isPathWithinWorkspace(input: string): boolean {
  return resolveWorkspaceRelativePath(input) !== null;
}

export function toContainerPath(relativePath: string): string {
  return relativePath === "" ? "/workspace" : `/workspace/${relativePath}`;
}
