# Marketing Site — StudyOS

How the public marketing surface is built, what conventions it follows, and how
to update it without breaking SEO or static rendering.

## Architecture

- All marketing pages live in the `(marketing)` **route group**
  (`src/app/(marketing)/`), so the root `/` is the landing page
  (`(marketing)/page.tsx`).
- `(marketing)/layout.tsx` renders `ToastProvider` → `StructuredData`
  (Organization + WebSite + SoftwareApplication JSON-LD) → `SiteHeader` →
  content → `SiteFooter`. It reads **no cookies/auth/headers**, so these pages
  stay statically generated and CDN-cacheable.
- The root `src/app/layout.tsx` keeps `<html lang="ko">` static for the same
  reason; the dynamic locale is applied only in the authenticated `(app)`
  layout. Do not add `cookies()`/`headers()` to the marketing tree.
- Marketing copy is **hardcoded Korean**, not via `features/i18n` (marketing
  pages don't mount `I18nProvider`). Data-driven sections read from
  `src/config/*.ts` modules:
  - `src/config/features.ts` — 6 feature cards.
  - `src/config/faq.ts` — 8 FAQ cards (rendered as static cards; `FaqStructuredData`
    JSON-LD is emitted only on the landing page).
  - `src/config/site.ts` — `siteConfig` (name/description), `CONTACT_EMAIL`,
    `MILESTONE_BANNER`, `CONTENT_UPDATED_AT` (hand-bumped edit date).
- Component pieces: `src/components/marketing/structured-data.tsx` and
  `src/components/marketing/product-preview.tsx` (static `/problems` mockup).
  Shared chrome: `src/components/layout/site-header.tsx`,
  `site-footer.tsx`, `site-logo.tsx`.

## Pages

| Route | File | Notes |
| --- | --- | --- |
| `/` | `(marketing)/page.tsx` | Hero (pill, H1, pitch, `/signup` + `/demo` CTAs), ProductPreview, 6 feature cards, pricing teaser (from `features/billing/plans.ts`), FAQ cards, final CTA, footer strip. |
| `/pricing` | `(marketing)/pricing/page.tsx` | Plan persona pitch + feature-limit comparison. CTA is **server-decided** via `isCheckoutUsable()` (fail-closed when payments are unconfigured — renders a disabled "출시 예정" button, never a dead "업그레이드"). |
| `/contact` | `(marketing)/contact/page.tsx` | Static contact cards; `CONTACT_EMAIL`. |
| `/terms`, `/privacy` | `redirect()` to `/legal/{terms,privacy}` | |
| `/legal/{slug}` | `(marketing)/legal/[slug]/page.tsx` | `generateStaticParams()` + `generateMetadata()` from the legal doc content. |

## SEO conventions

- **Metadata**: `src/app/layout.tsx` sets the base `metadataBase` (`SITE_URL`),
  title, description, OG, and twitter. Each marketing page overrides
  `alternates.canonical`, `openGraph`, and `twitter` (see pricing/contact as
  the template). Keep OG `locale: "ko_KR"`, `type: "website"`.
- **Convention files** at `src/app/`: `robots.ts` (disallows all `(app)`/`/dev`/
  maintenance routes; GEO allowlist for GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended, etc.; declares sitemap + host), `sitemap.ts`
  (`MARKETING_PATHS` + `DEMO_PATHS` + legal slugs; `lastModified` uses
  `CONTENT_UPDATED_AT`/legal `lastUpdated`, deliberately not "now"),
  `manifest.ts`, `opengraph-image.tsx` (dynamic 1200×630 via `next/og`),
  `icon.tsx`.
- **JSON-LD**: `StructuredData` (Org/WebSite/SoftwareApplication) across the
  marketing tree; `FAQPage` on `/` only. Keep in sync with any FAQ edits.
- **CSP** is Report-Only in `next.config.ts`; the AdSense, Vercel Analytics,
  Sentry, Supabase origins are pre-authorized there.

## If you add/churn marketing content

1. Edit the `config/*.ts` data (feature/FAQ copy), the landing `page.tsx`, or
   `config/site.ts` — then **bump `CONTENT_UPDATED_AT`** so `sitemap.ts`
   lastModified/`마지막 업데이트` reflect a real change date.
2. Keep copy honest: marketing may only promise features that actually exist
   (see pricing PLAN_PITCH rule). No "coming soon" features as if live.
3. For a new public route: add it to `MARKETING_PATHS` in `sitemap.ts` (and
   `robots.ts` allowlist if needed), add a metadata object on the page
   (canonical/OG/twitter), keep it statically renderable.
4. Run the checks: `npm run typecheck && npm run lint && npm run test`.
   Metadata/JSON-LD changes are type-checked at build; unverified "it worked"
   claims don't count.

## Related

- `public/llms.txt` — LLM/GEO landing doc (description, demo links, pricing,
  terms). Update it when the marketing message materially changes.
- `docs/BILLING_POLAR.md` — how pricing/entitlement actually works behind the
  pricing page CTAs.