import { describe, expect, it } from "vitest";
import {
  deriveMaterialType,
  resolveMimeType,
  sanitizeFilename,
} from "@/features/study-materials/filename";

describe("resolveMimeType", () => {
  it("keeps a specific declared MIME type as-is", () => {
    expect(resolveMimeType("notes.pdf", "application/pdf")).toBe("application/pdf");
  });

  it("falls back to the extension when the browser reports an empty type", () => {
    expect(resolveMimeType("plan.md", "")).toBe("text/markdown");
  });

  it("falls back to the extension when the browser reports application/octet-stream", () => {
    expect(resolveMimeType("plan.md", "application/octet-stream")).toBe("text/markdown");
  });

  it("returns the declared type unchanged when the extension is unrecognized", () => {
    expect(resolveMimeType("archive.zip", "")).toBe("");
  });

  it("is case-insensitive on the extension", () => {
    expect(resolveMimeType("NOTES.PDF", "")).toBe("application/pdf");
  });
});

describe("deriveMaterialType", () => {
  it("maps a whitelisted MIME type to its coarse type", () => {
    expect(deriveMaterialType("application/pdf")).toBe("PDF");
    expect(deriveMaterialType("text/plain")).toBe("TXT");
    expect(deriveMaterialType("text/markdown")).toBe("MD");
    expect(deriveMaterialType("image/png")).toBe("IMAGE");
    expect(deriveMaterialType("image/jpeg")).toBe("IMAGE");
  });

  it("returns null for an unsupported MIME type", () => {
    expect(deriveMaterialType("application/zip")).toBeNull();
    expect(deriveMaterialType("video/mp4")).toBeNull();
    expect(deriveMaterialType("")).toBeNull();
  });
});

describe("sanitizeFilename", () => {
  it("keeps a normal ASCII filename unchanged", () => {
    expect(sanitizeFilename("notes.pdf")).toBe("notes.pdf");
  });

  it("keeps Korean filenames unchanged", () => {
    expect(sanitizeFilename("수학 개념정리.pdf")).toBe("수학 개념정리.pdf");
  });

  it("replaces path separators so a filename can't escape its directory", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFilename("a\\b\\c.txt")).not.toContain("\\");
  });

  it("strips control characters and unsafe punctuation", () => {
    const result = sanitizeFilename("evil<script>.txt");
    expect(result).not.toMatch(/[<>]/);
  });

  it("strips leading dots so the result is never a hidden file", () => {
    expect(sanitizeFilename("..hidden.txt")).not.toMatch(/^\./);
  });

  it("falls back to a default name for a blank filename", () => {
    expect(sanitizeFilename("   ")).toBe("file");
  });

  it("replaces every character of a path-only name, never returning empty", () => {
    const result = sanitizeFilename("////");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("/");
  });

  it("truncates an excessively long filename", () => {
    const long = "a".repeat(500) + ".txt";
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(150);
  });
});
