import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspaceRelativePath } from "./workspace-path.js";

const execFileAsync = promisify(execFile);

export class InvalidPathError extends Error {
  constructor() {
    super("INVALID_PATH");
  }
}
export class GitError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/** Every arg is passed as a real argv element (never shell-interpolated) —
 * same defense-in-depth note as the old dev-runtime fs routes: even a
 * validator bug couldn't turn a crafted string into a shell primitive here,
 * because there is no shell in this call at all. */
async function git(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? String(err), exitCode: e.code ?? 1 };
  }
}

function isNotARepo(stderr: string): boolean {
  return /not a git repository/i.test(stderr);
}

export type GitStatus = { isRepo: boolean; branch?: string; files?: { status: string; path: string }[] };

export async function gitStatus(workspaceRoot: string): Promise<GitStatus> {
  const branch = await git(workspaceRoot, ["branch", "--show-current"]);
  if (isNotARepo(branch.stderr)) return { isRepo: false };

  const status = await git(workspaceRoot, ["status", "--porcelain=v1"]);
  const files = status.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3) }));
  return { isRepo: true, branch: branch.stdout.trim(), files };
}

export async function gitDiff(workspaceRoot: string, relativePath?: string): Promise<string> {
  const args = ["diff"];
  if (relativePath) {
    const safe = resolveWorkspaceRelativePath(relativePath);
    if (safe === null) throw new InvalidPathError();
    args.push("--", safe);
  }
  const result = await git(workspaceRoot, args);
  return result.stdout;
}

export type GitCommit = { hash: string; author: string; date: string; message: string };

export async function gitLog(workspaceRoot: string): Promise<GitCommit[]> {
  const result = await git(workspaceRoot, ["log", "-n", "20", "--pretty=format:%h\t%an\t%ar\t%s"]);
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...msg] = line.split("\t");
      return { hash: hash ?? "", author: author ?? "", date: date ?? "", message: msg.join("\t") };
    });
}

export async function gitAdd(workspaceRoot: string, relativePaths: string[]): Promise<void> {
  const safePaths: string[] = [];
  for (const p of relativePaths) {
    const safe = resolveWorkspaceRelativePath(p);
    if (safe === null) throw new InvalidPathError();
    safePaths.push(safe);
  }
  const result = await git(workspaceRoot, ["add", "--", ...safePaths]);
  if (result.exitCode !== 0) throw new GitError(result.stderr || "git add failed");
}

export async function gitCommit(workspaceRoot: string, message: string): Promise<void> {
  const result = await git(workspaceRoot, ["commit", "-m", message]);
  if (result.exitCode !== 0) throw new GitError(result.stderr || result.stdout || "git commit failed");
}
