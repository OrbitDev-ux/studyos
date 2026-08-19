import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Auth-gated app routes + operational areas: no public content to index, and
// they redirect to /login for crawlers anyway — keep them out of the index.
// Kept in sync with src/app/(app)/* (every segment there is gated by that
// route group's own layout, not just the ones middleware fast-paths via
// PROTECTED_PATHS in auth.config.ts — a route missing from PROTECTED_PATHS
// is still safely redirected by the layout, just not at the Edge).
const disallow = [
  "/admin",
  "/admin-auth",
  "/api/",
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
  "/profile",
  "/settings",
  "/support",
  "/tutor",
  "/notifications",
  "/lab",
  "/maintenance",
  "/suspended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // Explicitly welcome major AI/answer-engine crawlers (GEO): we want the
      // public marketing + demo pages cited in generative search results.
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "Google-Extended",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "CCBot",
        ],
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
