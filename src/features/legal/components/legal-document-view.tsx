import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import type { LegalDocument } from "@/features/legal/documents";
import { LEGAL_DOCUMENT_LIST } from "@/features/legal/documents";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

/**
 * Shared renderer for every /legal/* page. Server component (no interactivity):
 * the table of contents uses plain anchor links so it works without JS and
 * degrades gracefully on mobile (it stacks above the body). Design tokens and
 * spacing follow the existing marketing pages (max-w-3xl, muted-foreground).
 */
export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium">StudyOS 법적 고지</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{doc.title}</h1>
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>시행일: {formatDate(doc.effectiveDate)}</span>
            <span>최종 수정일: {formatDate(doc.lastUpdated)}</span>
            <span>버전: {doc.version}</span>
          </div>
          {doc.intro && (
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{doc.intro}</p>
          )}
        </header>

        {/* 목차 (table of contents) */}
        <nav aria-label="목차" className="bg-muted/40 rounded-lg border p-4">
          <p className="mb-2 text-xs font-semibold">목차</p>
          <ol className="flex flex-col gap-1">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-8">
          {doc.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="flex scroll-mt-20 flex-col gap-2"
            >
              <h2 className="text-base font-semibold">{section.title}</h2>
              {section.paragraphs?.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line"
                >
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
                  {section.list.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <Separator />

        {/* 다른 법적 문서로의 이동 */}
        <nav aria-label="다른 법적 문서" className="flex flex-col gap-2">
          <p className="text-xs font-semibold">다른 법적 문서</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL_DOCUMENT_LIST.filter((d) => d.slug !== doc.slug).map((d) => (
              <Link
                key={d.slug}
                href={`/legal/${d.slug}`}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {d.navLabel}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
