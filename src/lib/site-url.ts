/**
 * Canonical public origin — the single source used by metadata, sitemap,
 * robots, and JSON-LD so absolute URLs stay consistent across the app.
 *
 * In production AUTH_URL is the deployed domain; it falls back to localhost in
 * dev. Server-only: AUTH_URL is not a NEXT_PUBLIC var, so do NOT import this in
 * client components (it would resolve to the localhost fallback there).
 */
export const SITE_URL = process.env.AUTH_URL ?? "http://localhost:3000";
