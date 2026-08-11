import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { LEGAL_DOC_SLUGS } from "@/features/legal/documents";

// Public, crawlable pages only. /privacy and /terms are 307 redirects to their
// canonical /legal/[slug] pages, so we list the canonical targets below instead.
const MARKETING_PATHS = ["", "/pricing", "/contact", "/signup"];

const DEMO_PATHS = [
  "/demo",
  "/demo/dashboard",
  "/demo/problems",
  "/demo/review",
  "/demo/exams",
  "/demo/tutor",
  "/demo/weakness",
  "/demo/missions",
  "/demo/analytics",
  "/demo/profile",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const legalPaths = LEGAL_DOC_SLUGS.map((slug) => `/legal/${slug}`);

  return [...MARKETING_PATHS, ...DEMO_PATHS, ...legalPaths].map((path) => ({
    url: `${SITE_URL}${path || "/"}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
}
