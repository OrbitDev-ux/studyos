import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LEGAL_DOCUMENT_LIST } from "@/features/legal/documents";

// All six legal documents (single source: features/legal/documents) plus the
// contact link. Accessible from every marketing page via the shared footer.
const FOOTER_LINKS = [
  ...LEGAL_DOCUMENT_LIST.map((doc) => ({
    href: `/legal/${doc.slug}`,
    label: doc.navLabel,
  })),
  { href: "/contact", label: "문의하기" },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-muted-foreground text-xs">© 2026 {siteConfig.name}</p>
      </div>
    </footer>
  );
}
