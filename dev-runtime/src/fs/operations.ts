import { docker } from "../docker/container-manager.js";
import { containerNameFor } from "../docker/naming.js";
import { execCapture } from "../docker/exec.js";
import { toContainerPath } from "./workspace-path.js";

export type FsEntry = { name: string; type: "file" | "dir"; size: number };

const MAX_READ_BYTES = 2_000_000;
const MAX_WRITE_BYTES = 2_000_000;

/**
 * Every operation here receives an ALREADY-VALIDATED workspace-relative path
 * (routes/fs.ts rejects anything `resolveWorkspaceRelativePath` returns null
 * for before this module is ever called). As defense in depth, the path is
 * still never string-interpolated into a shell command — it's always passed
 * as a real argv element (`Cmd: [...]`) or as `sh -c '...' -- "$path"` (a
 * positional parameter, not text substitution), so even a validator bug
 * couldn't turn a crafted name into a shell-injection primitive.
 */
export async function listDir(workspaceId: string, relativePath: string): Promise<FsEntry[]> {
  const containerPath = toContainerPath(relativePath);
  const result = await execCapture(docker, containerNameFor(workspaceId), [
    "find",
    containerPath,
    "-mindepth",
    "1",
    "-maxdepth",
    "1",
    "-printf",
    "%y\t%s\t%f\n",
  ]);
  if (result.exitCode !== 0) return [];
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [type, size, name] = line.split("\t");
      return { name: name ?? "", type: type === "d" ? "dir" : "file", size: Number(size ?? 0) } as FsEntry;
    })
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
}

export async function readFile(workspaceId: string, relativePath: string): Promise<string> {
  const containerPath = toContainerPath(relativePath);
  const sizeCheck = await execCapture(docker, containerNameFor(workspaceId), ["stat", "-c", "%s", containerPath]);
  const size = Number(sizeCheck.stdout.trim() || "0");
  if (sizeCheck.exitCode !== 0) throw new Error("not_found");
  if (size > MAX_READ_BYTES) throw new Error("file_too_large");

  const result = await execCapture(docker, containerNameFor(workspaceId), ["cat", containerPath]);
  if (result.exitCode !== 0) throw new Error("read_failed");
  return result.stdout;
}

export async function writeFile(workspaceId: string, relativePath: string, content: string): Promise<void> {
  if (Buffer.byteLength(content, "utf8") > MAX_WRITE_BYTES) throw new Error("file_too_large");
  const containerPath = toContainerPath(relativePath);
  const result = await execCapture(
    docker,
    containerNameFor(workspaceId),
    ["sh", "-c", 'mkdir -p "$(dirname "$1")" && cat > "$1"', "--", containerPath],
    { input: content },
  );
  if (result.exitCode !== 0) throw new Error(result.stderr || "write_failed");
}

export async function mkdir(workspaceId: string, relativePath: string): Promise<void> {
  const containerPath = toContainerPath(relativePath);
  const result = await execCapture(docker, containerNameFor(workspaceId), ["mkdir", "-p", containerPath]);
  if (result.exitCode !== 0) throw new Error(result.stderr || "mkdir_failed");
}

export async function rename(workspaceId: string, fromRelative: string, toRelative: string): Promise<void> {
  const from = toContainerPath(fromRelative);
  const to = toContainerPath(toRelative);
  const result = await execCapture(docker, containerNameFor(workspaceId), ["mv", from, to]);
  if (result.exitCode !== 0) throw new Error(result.stderr || "rename_failed");
}

export async function remove(workspaceId: string, relativePath: string): Promise<void> {
  const containerPath = toContainerPath(relativePath);
  const result = await execCapture(docker, containerNameFor(workspaceId), ["rm", "-rf", "--", containerPath]);
  if (result.exitCode !== 0) throw new Error(result.stderr || "delete_failed");
}
