import { describe, expect, it } from "vitest";
import {
  isPathWithinWorkspace,
  resolveWorkspaceRelativePath,
  toContainerPath,
} from "../src/fs/workspace-path.js";

/** Mirrors src/features/dev/workspace-path.test.ts on the Web side — this
 * runtime keeps its own copy of the guard (§12), so it needs its own,
 * independently-passing coverage rather than trusting the Web side's. */
describe("resolveWorkspaceRelativePath — path traversal prevention (§12, §18, §30)", () => {
  it("normalizes safe relative paths", () => {
    expect(resolveWorkspaceRelativePath("src/app.tsx")).toBe("src/app.tsx");
    expect(resolveWorkspaceRelativePath("./src/./app.tsx")).toBe("src/app.tsx");
  });

  it("rejects climbing above the workspace root", () => {
    expect(resolveWorkspaceRelativePath("..")).toBeNull();
    expect(resolveWorkspaceRelativePath("../secret")).toBeNull();
    expect(resolveWorkspaceRelativePath("../../etc/passwd")).toBeNull();
  });

  it("allows '..' that stays inside the workspace", () => {
    expect(resolveWorkspaceRelativePath("src/../public/logo.png")).toBe("public/logo.png");
  });

  it("rejects absolute paths, drive paths, and schemes", () => {
    expect(resolveWorkspaceRelativePath("/etc/passwd")).toBeNull();
    expect(resolveWorkspaceRelativePath("C:\\Windows\\System32")).toBeNull();
    expect(resolveWorkspaceRelativePath("file:///etc/passwd")).toBeNull();
  });

  it("rejects backslash traversal and null bytes", () => {
    expect(resolveWorkspaceRelativePath("..\\..\\etc\\passwd")).toBeNull();
    expect(resolveWorkspaceRelativePath("safe.txt\0.png")).toBeNull();
  });

  it("rejects empty/non-string input", () => {
    expect(resolveWorkspaceRelativePath("")).toBeNull();
    expect(resolveWorkspaceRelativePath("   ")).toBeNull();
  });
});

describe("isPathWithinWorkspace / toContainerPath", () => {
  it("agree with resolveWorkspaceRelativePath", () => {
    expect(isPathWithinWorkspace("src/app.tsx")).toBe(true);
    expect(isPathWithinWorkspace("../../etc/passwd")).toBe(false);
    expect(toContainerPath("")).toBe("/workspace");
    expect(toContainerPath("src/app.tsx")).toBe("/workspace/src/app.tsx");
  });
});
