import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gitStatus, gitDiff, gitLog, gitAdd, gitCommit, InvalidPathError } from "../src/git-operations.js";

const execFileAsync = promisify(execFile);

async function initRepo(root: string): Promise<void> {
  await execFileAsync("git", ["init", "-q"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: root });
}

describe("git-operations (§18/§19)", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "studyos-dev-git-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reports isRepo: false outside a git repository", async () => {
    const status = await gitStatus(root);
    expect(status.isRepo).toBe(false);
  });

  it("status/diff/log/add/commit round-trip inside a real repo", async () => {
    await initRepo(root);
    await writeFile(path.join(root, "a.txt"), "hello");

    const status = await gitStatus(root);
    expect(status.isRepo).toBe(true);
    expect(status.files).toEqual([{ status: "??", path: "a.txt" }]);

    await gitAdd(root, ["a.txt"]);
    await gitCommit(root, "initial commit");

    const log = await gitLog(root);
    expect(log).toHaveLength(1);
    expect(log[0]?.message).toBe("initial commit");

    await writeFile(path.join(root, "a.txt"), "hello world");
    const diff = await gitDiff(root, "a.txt");
    expect(diff).toContain("hello world");
  });

  it("rejects a diff path that escapes the workspace", async () => {
    await initRepo(root);
    await expect(gitDiff(root, "../outside.txt")).rejects.toBeInstanceOf(InvalidPathError);
  });

  it("rejects an add path that escapes the workspace", async () => {
    await initRepo(root);
    await expect(gitAdd(root, ["../outside.txt"])).rejects.toBeInstanceOf(InvalidPathError);
  });
});
