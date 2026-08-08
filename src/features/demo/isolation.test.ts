import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Data-isolation guard for Public Demo Mode. The demo must never touch the real
 * database, the auth/session, Supabase, or the Gemini AI wrapper — it is a pure
 * static + client-state adapter. This test statically asserts that NO file under
 * the demo surface imports any of those, so a future edit can't silently wire
 * the demo into real user data or a paid AI call.
 */

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));

const DEMO_DIRS = [join(ROOT, "src/features/demo"), join(ROOT, "src/app/demo")];

// Import specifiers that would break isolation (real data / auth / AI cost).
const FORBIDDEN = [
  "@/lib/prisma",
  "@/lib/supabase",
  "@/lib/session", // requireCurrentUser → real user
  "@/lib/auth",
  "@/features/ai/client", // Gemini wrapper (generateStructured)
  "@/features/ai/generation-guard",
  "next-auth",
  "generateStructured",
  "requireCurrentUser",
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

describe("demo data isolation", () => {
  const files = DEMO_DIRS.flatMap(walk);

  it("scans a non-trivial number of demo files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("no demo file imports the DB, auth, Supabase, or the AI wrapper", () => {
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const bad of FORBIDDEN) {
        if (src.includes(bad)) {
          violations.push(`${file.replace(ROOT, "")} → ${bad}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
