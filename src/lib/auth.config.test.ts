import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for a repeat-offender bug class (see PROTECTED_PATHS's own
 * doc comment in auth.config.ts): a new authenticated route segment gets
 * added under src/app/(app)/* but forgotten from PROTECTED_PATHS, so the Edge
 * middleware never fast-paths its redirect (the route group's own layout
 * still requires a session, so this was never an actual auth bypass — just a
 * missed defense-in-depth layer, and one this test now catches instead of a
 * future manual audit finding it again).
 *
 * PROTECTED_PATHS itself isn't exported (kept private to auth.config.ts, the
 * Edge-runtime config), so this re-declares the current list and relies on a
 * human keeping the two in sync — same trade-off robots.ts's own `disallow`
 * list already makes for the identical reason.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const APP_GROUP_DIR = join(ROOT, "src/app/(app)");

const PROTECTED_PATHS = [
  "/dashboard",
  "/todos",
  "/subjects",
  "/stats",
  "/problems",
  "/study-books",
  "/study-bank",
  "/study-materials",
  "/review",
  "/mock-exam",
  "/social",
  "/ranking",
  "/battle",
  "/support",
  "/tutor",
  "/settings",
  "/notifications",
  "/lab",
  "/profile",
  "/dev",
];

function appGroupSegments(): string[] {
  return readdirSync(APP_GROUP_DIR)
    .filter((entry) => statSync(join(APP_GROUP_DIR, entry)).isDirectory())
    .map((entry) => `/${entry}`);
}

describe("PROTECTED_PATHS", () => {
  it("covers every route segment under src/app/(app)/*", () => {
    const segments = appGroupSegments();
    expect(segments.length).toBeGreaterThan(10);

    const missing = segments.filter((segment) => !PROTECTED_PATHS.includes(segment));
    expect(missing).toEqual([]);
  });
});
