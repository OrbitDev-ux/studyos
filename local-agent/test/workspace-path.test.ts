import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  resolveWorkspaceRelativePath,
  resolveInWorkspace,
  WorkspaceEscapeError,
} from "../src/workspace-path.js";

describe("resolveWorkspaceRelativePath — string-level guard (§8)", () => {
  it("accepts a normal relative path", () => {
    expect(resolveWorkspaceRelativePath("src/index.ts")).toBe("src/index.ts");
  });

  it("normalizes '.' segments", () => {
    expect(resolveWorkspaceRelativePath("./src/./index.ts")).toBe("src/index.ts");
  });

  it("rejects ../ traversal above the root", () => {
    expect(resolveWorkspaceRelativePath("../etc/passwd")).toBeNull();
    expect(resolveWorkspaceRelativePath("a/../../b")).toBeNull();
  });

  it("resolves an internal .. that stays inside the root", () => {
    expect(resolveWorkspaceRelativePath("a/b/../c")).toBe("a/c");
  });

  it("rejects absolute paths", () => {
    expect(resolveWorkspaceRelativePath("/etc/passwd")).toBeNull();
  });

  it("rejects Windows drive paths and URL schemes", () => {
    expect(resolveWorkspaceRelativePath("C:\\Windows")).toBeNull();
    expect(resolveWorkspaceRelativePath("file:///etc/passwd")).toBeNull();
  });

  it("rejects null bytes and empty input", () => {
    expect(resolveWorkspaceRelativePath("a\0b")).toBeNull();
    expect(resolveWorkspaceRelativePath("")).toBeNull();
    expect(resolveWorkspaceRelativePath("   ")).toBeNull();
  });
});

describe("resolveInWorkspace — canonical/real-path boundary (§8)", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "studyos-dev-ws-"));
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "index.ts"), "hello");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("resolves the root itself", async () => {
    const resolved = await resolveInWorkspace(root, "");
    expect(resolved).toBe(await realpath(root));
  });

  it("resolves an existing file inside the workspace", async () => {
    const resolved = await resolveInWorkspace(root, "src/index.ts");
    expect(resolved.endsWith(path.join("src", "index.ts"))).toBe(true);
  });

  it("resolves a not-yet-created path (for writes/mkdir)", async () => {
    const resolved = await resolveInWorkspace(root, "src/new-file.ts");
    expect(resolved.endsWith(path.join("src", "new-file.ts"))).toBe(true);
  });

  it("rejects ../ traversal", async () => {
    await expect(resolveInWorkspace(root, "../outside.txt")).rejects.toBeInstanceOf(WorkspaceEscapeError);
  });

  it("rejects a symlink planted inside the workspace that points outside it", async () => {
    const outsideDir = await mkdtemp(path.join(tmpdir(), "studyos-dev-outside-"));
    await writeFile(path.join(outsideDir, "secret.txt"), "should never be reachable");
    try {
      await symlink(outsideDir, path.join(root, "escape-link"));
      await expect(resolveInWorkspace(root, "escape-link/secret.txt")).rejects.toBeInstanceOf(WorkspaceEscapeError);
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked ancestor even for a path that doesn't exist yet", async () => {
    const outsideDir = await mkdtemp(path.join(tmpdir(), "studyos-dev-outside-"));
    try {
      await symlink(outsideDir, path.join(root, "escape-link2"));
      await expect(resolveInWorkspace(root, "escape-link2/not-created-yet.txt")).rejects.toBeInstanceOf(
        WorkspaceEscapeError,
      );
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
  });
});
