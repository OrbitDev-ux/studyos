import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let homeDir: string;

vi.mock("../src/config.js", async () => {
  const actual = await vi.importActual<typeof import("../src/config.js")>("../src/config.js");
  return {
    ...actual,
    get config() {
      return { ...actual.config, homeDir };
    },
    get CONFIG_FILE() {
      return path.join(homeDir, "config.json");
    },
  };
});

describe("local-config (§8)", () => {
  beforeEach(async () => {
    homeDir = await mkdtemp(path.join(tmpdir(), "studyos-dev-home-"));
  });

  afterEach(async () => {
    await rm(homeDir, { recursive: true, force: true });
    vi.resetModules();
  });

  it("addWorkspace rejects a path that doesn't exist", async () => {
    const { addWorkspace } = await import("../src/local-config.js");
    await expect(addWorkspace(path.join(homeDir, "does-not-exist"))).rejects.toThrow("WORKSPACE_NOT_FOUND");
  });

  it("addWorkspace rejects a path that is a file, not a directory", async () => {
    const { addWorkspace } = await import("../src/local-config.js");
    const file = path.join(homeDir, "a-file.txt");
    await writeFile(file, "x");
    await expect(addWorkspace(file)).rejects.toThrow("WORKSPACE_NOT_FOUND");
  });

  it("addWorkspace stores the CANONICAL path and de-dupes by it", async () => {
    const { addWorkspace, readLocalConfig } = await import("../src/local-config.js");
    const project = path.join(homeDir, "project");
    await mkdir(project);

    const first = await addWorkspace(project, "My Project");
    const second = await addWorkspace(project); // same folder again

    expect(second.id).toBe(first.id);
    const config = await readLocalConfig();
    expect(config.workspaces).toHaveLength(1);
    expect(config.workspaces[0]?.name).toBe("My Project");
  });

  it("removeWorkspace removes only the targeted entry", async () => {
    const { addWorkspace, removeWorkspace, readLocalConfig } = await import("../src/local-config.js");
    const a = path.join(homeDir, "a");
    const b = path.join(homeDir, "b");
    await mkdir(a);
    await mkdir(b);
    const wsA = await addWorkspace(a);
    await addWorkspace(b);

    await removeWorkspace(wsA.id);
    const config = await readLocalConfig();
    expect(config.workspaces).toHaveLength(1);
    expect(config.workspaces[0]?.path).toBe(await import("node:fs/promises").then((fs) => fs.realpath(b)));
  });
});
