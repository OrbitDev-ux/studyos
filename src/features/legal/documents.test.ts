import { describe, expect, it } from "vitest";
import {
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_LIST,
  LEGAL_DOC_SLUGS,
  getLegalDocument,
} from "@/features/legal/documents";

describe("legal documents", () => {
  it("defines all six required documents at the required paths", () => {
    expect(LEGAL_DOC_SLUGS).toEqual([
      "terms",
      "privacy",
      "subscription",
      "refund",
      "ai",
      "community",
    ]);
    expect(LEGAL_DOCUMENT_LIST).toHaveLength(6);
  });

  it("each document has version, effective/updated dates, and sections", () => {
    for (const doc of LEGAL_DOCUMENT_LIST) {
      expect(doc.slug).toBeTruthy();
      expect(doc.title).toBeTruthy();
      expect(doc.version).toMatch(/^\d+\.\d+$/);
      expect(doc.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.sections.length).toBeGreaterThan(0);
      // section anchors must be unique within a document
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      // every section renders something
      for (const section of doc.sections) {
        expect(section.title).toBeTruthy();
        expect((section.paragraphs?.length ?? 0) + (section.list?.length ?? 0)).toBeGreaterThan(0);
      }
    }
  });

  it("the record key matches each document's own slug", () => {
    for (const slug of LEGAL_DOC_SLUGS) {
      expect(LEGAL_DOCUMENTS[slug].slug).toBe(slug);
    }
  });

  it("getLegalDocument resolves known slugs and rejects unknown ones", () => {
    expect(getLegalDocument("terms")?.slug).toBe("terms");
    expect(getLegalDocument("nope")).toBeUndefined();
    expect(getLegalDocument("__proto__")).toBeUndefined();
  });

  it("does not invent unconfirmed business info — leaves placeholders", () => {
    // The privacy policy must mark unconfirmed processor/officer info, never
    // fabricate a company name, address, or PG.
    const privacyText = LEGAL_DOCUMENTS.privacy.sections
      .flatMap((s) => [...(s.paragraphs ?? []), ...(s.list ?? [])])
      .join("\n");
    expect(privacyText).toContain("[추후 입력]");
  });

  it("states the free-only product policy and labels paid terms as historical", () => {
    expect(LEGAL_DOCUMENTS.terms.sections[0]?.paragraphs?.[1]).toContain("현재 무료 전용");
    expect(LEGAL_DOCUMENTS.terms.sections[0]?.paragraphs?.[1]).toContain("새 유료 요금제나 결제");
    expect(LEGAL_DOCUMENTS.subscription.intro).toContain("현재 FREE ONLY");
    expect(LEGAL_DOCUMENTS.subscription.intro).toContain("과거 요금제");
    expect(LEGAL_DOCUMENTS.refund.intro).toContain("현재 FREE ONLY");
    expect(LEGAL_DOCUMENTS.refund.intro).toContain("법률 검토가 필요합니다");
  });
});
