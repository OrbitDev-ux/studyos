/**
 * Canonical public origin — the single source used by metadata, sitemap,
 * robots, and JSON-LD so absolute URLs stay consistent across the app.
 *
 * AUTH_URL (operator-set, the real custom domain) wins when present. Without
 * it, fall back to Vercel's own system env vars instead of localhost, so a
 * deploy that hasn't had AUTH_URL configured yet still emits a working
 * sitemap/robots/canonical instead of silently pointing everything at
 * http://localhost:3000. VERCEL_PROJECT_PRODUCTION_URL is the stable
 * production domain; VERCEL_URL is the current (possibly preview) deployment
 * URL — both are host-only (no protocol) per Vercel's docs. Only true local
 * dev (neither AUTH_URL nor any VERCEL_* var set) reaches the localhost
 * fallback. Server-only: AUTH_URL is not a NEXT_PUBLIC var, so do NOT import
 * this in client components (it would resolve to the localhost fallback
 * there).
 */
export const SITE_URL =
  process.env.AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ??
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
  "http://localhost:3000";
