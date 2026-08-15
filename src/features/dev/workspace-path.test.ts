import { describe, expect, it } from "vitest";
import {
  isPathWithinWorkspace,
  resolveWorkspaceRelativePath,
  toContainerPath,
} from "@/features/dev/workspace-path";

describe("resolveWorkspaceRelativePath — path traversal prevention (§18, §38)", () => {
  it("normalizes safe relative paths", () => {
    expect(resolveWorkspaceRelativePath("src/app.tsx")).toBe("src/app.tsx");
    expect(resolveWorkspaceRelativePath("./src/./app.tsx")).toBe("src/app.tsx");
    expect(resolveWorkspaceRelativePath("")).toBeNull();
  });

  it("rejects a bare '..' escape", () => {
    expect(resolveWorkspaceRelativePath("..")).toBeNull();
    expect(resolveWorkspaceRelativePath("../")).toBeNull();
  });

  it("rejects climbing above the workspace root", () => {
    expect(resolveWorkspaceRelativePath("../secret")).toBeNull();
    expect(resolveWorkspaceRelativePath("../../etc/passwd")).toBeNull();
    expect(resolveWorkspaceRelativePath("a/../../b")).toBeNull();
  });

  it("allows '..' that stays inside the workspace", () => {
    // src/../public/logo.png === public/logo.png — still inside the root.
    expect(resolveWorkspaceRelativePath("src/../public/logo.png")).toBe("public/logo.png");
  });

  it("rejects absolute paths", () => {
    expect(resolveWorkspaceRelativePath("/etc/passwd")).toBeNull();
    expect(resolveWorkspaceRelativePath("/workspace/../../etc/passwd")).toBeNull();
  });

  it("rejects Windows-style drive paths and backslash traversal", () => {
    expect(resolveWorkspaceRelativePath("C:\\Windows\\System32")).toBeNull();
    expect(resolveWorkspaceRelativePath("..\\..\\etc\\passwd")).toBeNull();
  });

  it("rejects URL schemes", () => {
    expect(resolveWorkspaceRelativePath("file:///etc/passwd")).toBeNull();
  });

  it("rejects null-byte injection", () => {
    expect(resolveWorkspaceRelativePath("safe.txt\0.png")).toBeNull();
  });

  it("rejects non-string / empty input", () => {
    expect(resolveWorkspaceRelativePath(undefined as unknown as string)).toBeNull();
    expect(resolveWorkspaceRelativePath("   ")).toBeNull();
  });
});

describe("isPathWithinWorkspace", () => {
  it("mirrors resolveWorkspaceRelativePath's verdict", () => {
    expect(isPathWithinWorkspace("src/app.tsx")).toBe(true);
    expect(isPathWithinWorkspace("../../etc/passwd")).toBe(false);
  });
});

describe("toContainerPath", () => {
  it("prefixes with the workspace root", () => {
    expect(toContainerPath("")).toBe("/workspace");
    expect(toContainerPath("src/app.tsx")).toBe("/workspace/src/app.tsx");
  });
});
