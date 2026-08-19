import { FAQ_ITEMS } from "@/config/faq";
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
      name: siteConfig.name,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "ko-KR",
      url: SITE_URL,
      description: siteConfig.description,
      offers: PLANS.map((plan) => {
        const meta = PLAN_META[plan];
        return {
          "@type": "Offer",
          name: meta.name,
          price: meta.priceKrw,
          priceCurrency: "KRW",
          category: meta.priceKrw === 0 ? "free" : "subscription",
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
