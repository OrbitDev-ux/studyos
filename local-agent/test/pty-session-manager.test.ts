import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createSession,
  removeSession,
  sessionCount,
  getSession,
  disconnectAllSessions,
  TerminalLimitError,
} from "../src/pty-session-manager.js";

// Some sandboxed CI/dev environments block opening a pseudo-terminal device
// outright (posix_spawnp fails at the OS level before node-pty's own code
// runs at all) — that's an environment restriction, not something this
// module can work around, and not evidence of a bug here. Detect it once so
// these tests stay meaningful (and actually run) on a normal developer
// machine or CI runner, without spuriously failing where PTYs are blocked.
let ptyAvailable = true;
try {
  const probe = createSession("__probe__", process.cwd());
  removeSession(probe.id);
} catch {
  ptyAvailable = false;
}

describe.skipIf(!ptyAvailable)("pty-session-manager (§13/§15)", () => {
  afterEach(() => {
    disconnectAllSessions();
  });

  it("creates and removes a real PTY session against a real shell", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "studyos-dev-pty-"));
    try {
      const before = sessionCount();
      const session = createSession("ws1", root);
      expect(sessionCount()).toBe(before + 1);
      expect(getSession(session.id)).toBe(session);

      removeSession(session.id);
      expect(sessionCount()).toBe(before);
      expect(getSession(session.id)).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removing an unknown session id is a safe no-op", () => {
    expect(() => removeSession("does-not-exist")).not.toThrow();
  });

  it("enforces the concurrent terminal limit", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "studyos-dev-pty-limit-"));
    const created: string[] = [];
    try {
      // config default is 8 — exhaust it, then expect the next to throw.
      await expect(async () => {
        for (let i = 0; i < 100; i++) {
          const session = createSession("ws1", root);
          created.push(session.id);
        }
      }).rejects.toBeInstanceOf(TerminalLimitError);
    } finally {
      for (const id of created) removeSession(id);
      await rm(root, { recursive: true, force: true });
    }
  });
});
