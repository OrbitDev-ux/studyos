import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Auth-gated app routes + operational areas: no public content to index, and
// they redirect to /login for crawlers anyway — keep them out of the index.
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
  "/review",
  "/mock-exam",
  "/social",
  "/ranking",
  "/battle",
  "/profile",
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
