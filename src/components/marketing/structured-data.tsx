import { FAQ_ITEMS } from "@/config/faq";
import { FEATURES } from "@/config/features";
import { siteConfig } from "@/config/site";
import { PLANS, PLAN_META } from "@/features/billing/plans";
import { SITE_URL } from "@/lib/site-url";

/**
 * Schema.org JSON-LD for the public site — helps search engines and generative
 * answer engines (GEO) understand and cite StudyOS. Rendered once in the
 * marketing layout so every public page carries Organization + WebSite +
 * SoftwareApplication. Data is app-controlled (no user input), so serializing
 * it into a script tag is safe.
 */
export function StructuredData() {
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: siteConfig.name,
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
      description: siteConfig.description,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: siteConfig.name,
      url: SITE_URL,
      inLanguage: "ko-KR",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: siteConfig.name,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "ko-KR",
      url: SITE_URL,
      description: siteConfig.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      provider: { "@id": `${SITE_URL}/#organization` },
      featureList: FEATURES.map((feature) => feature.title),
      offers: PLANS.filter((plan) => !PLAN_META[plan].notForSale).map((plan) => {
        const meta = PLAN_META[plan];
        // Schema.org `price` is in the currency's main unit (KRW is the minor
        // unit itself); USD minor units are scaled up from cents.
        const price = meta.currency === "USD" ? meta.priceMinor / 100 : meta.priceMinor;
        return {
          "@type": "Offer",
          name: meta.name,
          price,
          priceCurrency: meta.currency,
          category: meta.priceMinor === 0 ? "free" : "subscription",
        };
      }),
    },
  ];

  const json = { "@context": "https://schema.org", "@graph": graph };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/**
 * FAQPage JSON-LD. Render ONLY on a page that visibly shows the same FAQ items
 * (the landing page) — Google requires the structured data to mirror on-page
 * content. Shares FAQ_ITEMS with the visible section so the two never diverge.
 */
export function FaqStructuredData() {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
