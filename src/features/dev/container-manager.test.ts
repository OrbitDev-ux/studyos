import { describe, expect, it } from "vitest";
import { UnavailableContainerManager } from "@/features/dev/unavailable-container-manager";

/**
 * v1 ships no real container backend (§1/§10 analysis: Vercel has no Docker
 * daemon). This locks in the honesty contract: every operation must report
 * failure, never resolve `ok: true`, and never throw — so callers can't
 * accidentally mark a workspace RUNNING when nothing was actually started.
 */
describe("UnavailableContainerManager — honesty contract", () => {
  const manager = new UnavailableContainerManager();

  it.each([
    ["ensureContainer", () => manager.ensureContainer("ws1", "user1")],
    ["start", () => manager.start("ws1")],
    ["stop", () => manager.stop("ws1")],
    ["restart", () => manager.restart("ws1")],
    ["destroy", () => manager.destroy("ws1")],
  ])("%s never claims success", async (_name, call) => {
    const result = await call();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("BACKEND_UNAVAILABLE");
      expect(typeof result.message).toBe("string");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("never throws", async () => {
    await expect(manager.ensureContainer("ws1", "user1")).resolves.toBeDefined();
  });
});
