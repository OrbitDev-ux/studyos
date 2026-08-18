/**
 * AdSense configuration — all IDs come from env vars (never hardcoded). A
 * placement maps to its own ad slot so different pages can be tuned/limited
 * independently. When the client id or a slot is missing (e.g. local dev, or
 * before AdSense approval), the AdSlot renders a labeled placeholder instead of
 * calling AdSense, so nothing breaks and no invalid requests are made.
 *
 * Required env (see .env.example):
 *   NEXT_PUBLIC_ADSENSE_CLIENT_ID       e.g. ca-pub-XXXXXXXXXXXXXXXX
 *   NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT
 *   NEXT_PUBLIC_ADSENSE_RESULT_SLOT
 *   NEXT_PUBLIC_ADSENSE_MOCK_EXAM_SLOT
 *   NEXT_PUBLIC_ADSENSE_REVIEW_SLOT
 */
export type AdPlacement =
  | "dashboard"
  | "study-result"
  | "mock-exam-result"
  | "review";

export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

// NEXT_PUBLIC_* must be referenced statically to be inlined by Next at build.
const SLOT_BY_PLACEMENT: Record<AdPlacement, string | undefined> = {
  dashboard: process.env.NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT,
  "study-result": process.env.NEXT_PUBLIC_ADSENSE_RESULT_SLOT,
  "mock-exam-result": process.env.NEXT_PUBLIC_ADSENSE_MOCK_EXAM_SLOT,
  review: process.env.NEXT_PUBLIC_ADSENSE_REVIEW_SLOT,
};

export function getAdSlot(placement: AdPlacement): string | undefined {
  return SLOT_BY_PLACEMENT[placement];
}

/** True only when a real AdSense client id + this placement's slot are set. */
export function isAdSenseConfigured(placement: AdPlacement): boolean {
  const slot = getAdSlot(placement);
  // Do not send browser requests for placeholders or malformed production envs.
  return Boolean(ADSENSE_CLIENT_ID?.match(/^ca-pub-\d+$/) && slot?.match(/^\d+$/));
}
