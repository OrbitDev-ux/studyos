import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { realpath, stat } from "node:fs/promises";
import { CONFIG_FILE, config } from "./config.js";

export type WorkspaceEntry = { id: string; name: string; path: string; addedAt: string };

export type LocalConfig = {
  deviceId: string | null;
  workspaces: WorkspaceEntry[];
};

const EMPTY: LocalConfig = { deviceId: null, workspaces: [] };

/**
 * The agent's own per-machine state (§8, §27): which device it is (StudyOS
 * only knows the id, never the raw secret — that's credential-store.ts) and
 * which folders the user has explicitly chosen as workspaces. Real absolute
 * paths live ONLY here, never in StudyOS's database — this file IS the
 * "source of truth chosen on the user's own machine" the spec requires.
 */
export async function readLocalConfig(): Promise<LocalConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalConfig>;
    return {
      deviceId: typeof parsed.deviceId === "string" ? parsed.deviceId : null,
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Atomic write (§11) — a crash mid-write can never leave a truncated/corrupt
 * config file behind. */
export async function writeLocalConfig(next: LocalConfig): Promise<void> {
  await mkdir(config.homeDir, { recursive: true, mode: 0o700 });
  const tmp = `${CONFIG_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(tmp, CONFIG_FILE);
}

export async function setDeviceId(deviceId: string): Promise<void> {
  const current = await readLocalConfig();
  await writeLocalConfig({ ...current, deviceId });
}

export async function clearDevice(): Promise<void> {
  const current = await readLocalConfig();
  await writeLocalConfig({ ...current, deviceId: null });
}

/** Adds a workspace after resolving it to a REAL, existing, canonical
 * directory (§8) — rejects anything that doesn't exist or isn't a directory
 * outright rather than silently creating one, and de-dupes by canonical path
 * so picking the same folder twice doesn't create two entries. */
export async function addWorkspace(rawPath: string, name?: string): Promise<WorkspaceEntry> {
  const canonical = await realpath(rawPath).catch(() => {
    throw new Error("WORKSPACE_NOT_FOUND");
  });
  const info = await stat(canonical).catch(() => {
    throw new Error("WORKSPACE_NOT_FOUND");
  });
  if (!info.isDirectory()) throw new Error("WORKSPACE_NOT_FOUND");

  const current = await readLocalConfig();
  const existing = current.workspaces.find((w) => w.path === canonical);
  if (existing) return existing;

  const entry: WorkspaceEntry = {
    id: randomUUID(),
    name: name?.trim() || path.basename(canonical),
    path: canonical,
    addedAt: new Date().toISOString(),
  };
  await writeLocalConfig({ ...current, workspaces: [...current.workspaces, entry] });
  return entry;
}

export async function removeWorkspace(id: string): Promise<void> {
  const current = await readLocalConfig();
  await writeLocalConfig({ ...current, workspaces: current.workspaces.filter((w) => w.id !== id) });
}

export async function getWorkspace(id: string): Promise<WorkspaceEntry | null> {
  const current = await readLocalConfig();
  return current.workspaces.find((w) => w.id === id) ?? null;
}
