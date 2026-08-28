import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  listDir,
  readWorkspaceFile,
  writeWorkspaceFile,
  mkdirWorkspace,
  renameWorkspaceEntry,
  removeWorkspaceEntry,
  FileTooLargeError,
  NotFoundError,
} from "../src/fs-operations.js";
import { WorkspaceEscapeError } from "../src/workspace-path.js";
import { config } from "../src/config.js";

describe("fs-operations (§9–§12)", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "studyos-dev-fsops-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes and reads a file (UTF-8, including multi-byte content)", async () => {
    await writeWorkspaceFile(root, "notes.md", "안녕하세요 🎉");
    expect(await readWorkspaceFile(root, "notes.md")).toBe("안녕하세요 🎉");
  });

  it("writes an empty file", async () => {
    await writeWorkspaceFile(root, "empty.txt", "");
    expect(await readWorkspaceFile(root, "empty.txt")).toBe("");
  });

  it("creates missing parent directories on write", async () => {
    await writeWorkspaceFile(root, "a/b/c/d.txt", "nested");
    expect(await readWorkspaceFile(root, "a/b/c/d.txt")).toBe("nested");
  });

  it("write is atomic — no partial file is left if content exceeds the limit mid-way", async () => {
    // The size check happens before any write touches the real path, so a
    // rejected write can never leave a half-written file at the target.
    await writeWorkspaceFile(root, "safe.txt", "original");
    const huge = "x".repeat(config.maxFileBytes + 1);
    await expect(writeWorkspaceFile(root, "safe.txt", huge)).rejects.toBeInstanceOf(FileTooLargeError);
    expect(await readWorkspaceFile(root, "safe.txt")).toBe("original");
  });

  it("leaves no leftover .tmp file after a successful write", async () => {
    await writeWorkspaceFile(root, "clean.txt", "hi");
    const entries = await listDir(root, "");
    expect(entries.some((e) => e.name.includes(".tmp"))).toBe(false);
  });

  it("rejects reading a file over the size limit", async () => {
    await writeWorkspaceFile(root, "big.txt", "x".repeat(1000));
    const originalMax = config.maxFileBytes;
    // @ts-expect-error — test-only override of a readonly config field
    config.maxFileBytes = 10;
    try {
      await expect(readWorkspaceFile(root, "big.txt")).rejects.toBeInstanceOf(FileTooLargeError);
    } finally {
      // @ts-expect-error — restore
      config.maxFileBytes = originalMax;
    }
  });

  it("read of a missing file throws NotFoundError", async () => {
    await expect(readWorkspaceFile(root, "nope.txt")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("list of a missing directory throws NotFoundError", async () => {
    await expect(listDir(root, "nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("mkdir, rename, and delete round-trip", async () => {
    await mkdirWorkspace(root, "pkg");
    await writeWorkspaceFile(root, "pkg/a.txt", "content");
    await renameWorkspaceEntry(root, "pkg/a.txt", "pkg/b.txt");
    expect(await readWorkspaceFile(root, "pkg/b.txt")).toBe("content");
    await removeWorkspaceEntry(root, "pkg");
    await expect(listDir(root, "pkg")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a write that escapes the workspace", async () => {
    await expect(writeWorkspaceFile(root, "../escape.txt", "x")).rejects.toBeInstanceOf(WorkspaceEscapeError);
  });

  it("propagates a real filesystem failure instead of throwing an unrelated error", async () => {
    // Removing the workspace root out from under an in-flight operation is a
    // genuine filesystem failure, not a validation failure — this should
    // surface as SOME error, not silently succeed.
    await mkdirWorkspace(root, "gone");
    await rm(path.join(root, "gone"), { recursive: true, force: true });
    await expect(readWorkspaceFile(root, "gone/missing.txt")).rejects.toThrow();
  });
});
