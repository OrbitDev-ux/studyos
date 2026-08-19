import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { LEGAL_DOC_SLUGS, LEGAL_DOCUMENTS } from "@/features/legal/documents";
import { CONTENT_UPDATED_AT } from "@/config/site";

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

// lastModified reflects the actual last edit, not "now" — a fresh timestamp on
// every crawl is a meaningless freshness signal. Marketing/demo pages share
// CONTENT_UPDATED_AT (bumped by hand when their content changes); legal pages
// use each document's own tracked lastUpdated (features/legal/documents.ts),
// which is already the real source of truth for those.
export default function sitemap(): MetadataRoute.Sitemap {
  const marketingAndDemo = [...MARKETING_PATHS, ...DEMO_PATHS].map((path) => ({
    url: `${SITE_URL}${path || "/"}`,
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const legal = LEGAL_DOC_SLUGS.map((slug) => ({
    url: `${SITE_URL}/legal/${slug}`,
    lastModified: LEGAL_DOCUMENTS[slug].lastUpdated,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...marketingAndDemo, ...legal];
}
