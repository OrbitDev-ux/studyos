import { readdir, readFile, rename, rm, stat, mkdir, open } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { resolveInWorkspace } from "./workspace-path.js";

export type FsEntry = { name: string; type: "file" | "dir"; size: number };
export class FileTooLargeError extends Error {
  constructor() {
    super("FILE_TOO_LARGE");
  }
}
export class NotFoundError extends Error {
  constructor() {
    super("FILE_NOT_FOUND");
  }
}

export async function listDir(workspaceRoot: string, relativePath: string): Promise<FsEntry[]> {
  const target = await resolveInWorkspace(workspaceRoot, relativePath);
  let entries;
  try {
    entries = await readdir(target, { withFileTypes: true });
  } catch {
    throw new NotFoundError();
  }
  const results = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(target, entry.name);
      const isDir = entry.isDirectory();
      let size = 0;
      if (!isDir) {
        try {
          size = (await stat(full)).size;
        } catch {
          size = 0;
        }
      }
      return { name: entry.name, type: isDir ? ("dir" as const) : ("file" as const), size };
    }),
  );
  return results.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
}

export async function readWorkspaceFile(workspaceRoot: string, relativePath: string): Promise<string> {
  const target = await resolveInWorkspace(workspaceRoot, relativePath);
  let info;
  try {
    info = await stat(target);
  } catch {
    throw new NotFoundError();
  }
  if (!info.isFile()) throw new NotFoundError();
  if (info.size > config.maxFileBytes) throw new FileTooLargeError();
  return readFile(target, "utf8");
}

/**
 * Atomic write (§11): write to a sibling temp file, fsync it, then rename
 * over the real path. A crash mid-write leaves the temp file orphaned — the
 * real file is never left half-written. `rename` within the same directory
 * is atomic on every filesystem this agent targets (APFS/ext4/NTFS).
 */
export async function writeWorkspaceFile(workspaceRoot: string, relativePath: string, content: string): Promise<void> {
  if (Buffer.byteLength(content, "utf8") > config.maxFileBytes) throw new FileTooLargeError();
  const target = await resolveInWorkspace(workspaceRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });

  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(tmp, "w");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmp, target);
}

export async function mkdirWorkspace(workspaceRoot: string, relativePath: string): Promise<void> {
  const target = await resolveInWorkspace(workspaceRoot, relativePath);
  await mkdir(target, { recursive: true });
}

export async function renameWorkspaceEntry(workspaceRoot: string, fromRelative: string, toRelative: string): Promise<void> {
  const from = await resolveInWorkspace(workspaceRoot, fromRelative);
  // The destination need not exist yet — resolveInWorkspace already handles
  // not-yet-created targets by canonicalizing the nearest real ancestor.
  const to = await resolveInWorkspace(workspaceRoot, toRelative);
  await mkdir(path.dirname(to), { recursive: true });
  await rename(from, to);
}

export async function removeWorkspaceEntry(workspaceRoot: string, relativePath: string): Promise<void> {
  const target = await resolveInWorkspace(workspaceRoot, relativePath);
  await rm(target, { recursive: true, force: true });
}
