import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { LegalDocumentView } from "@/features/legal/components/legal-document-view";
import { LEGAL_DOC_SLUGS, getLegalDocument } from "@/features/legal/documents";

// Static, public pages — prerendered for every known slug.
export function generateStaticParams() {
  return LEGAL_DOC_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc) return {};
  return {
    title: `${doc.title} - ${siteConfig.name}`,
    description: doc.summary,
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc) notFound();

  return <LegalDocumentView doc={doc} />;
}
