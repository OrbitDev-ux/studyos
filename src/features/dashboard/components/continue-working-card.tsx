import Link from "next/link";
import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import type { Messages } from "@/features/i18n/messages";

export type ContinueItem = {
  key: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
};

/**
 * The dashboard's primary above-the-fold section — "what was I doing, and
 * how do I get back to it in one click." Every tile is built from real,
 * already-fetched signals (active study session, due reviews, an in-progress
 * mock exam, the most recent AI Tutor chat, an unread DM) — never a
 * fabricated placeholder. Capped by the caller at a handful of tiles so this
 * never turns into another wall of cards.
 */
export function ContinueWorkingCard({
  items,
  t,
}: {
  items: ContinueItem[];
  t: Messages["dashboard"];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {t.continueTitle}
      </h2>
      {items.length === 0 ? (
        <Link
          href="/problems"
          className="border-border hover:bg-muted/50 focus-visible:ring-ring flex items-center justify-between gap-3 rounded-xl border px-5 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Sparkles className="size-5" />
            </span>
            <p className="text-sm font-medium">{t.continueEmpty}</p>
          </div>
          <span className="text-primary flex shrink-0 items-center gap-1 text-sm font-medium">
            {t.continueEmptyCta}
            <ArrowRight className="size-4" />
          </span>
        </Link>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="border-border hover:border-primary/30 hover:bg-muted/40 focus-visible:ring-ring group flex items-start gap-3 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <item.icon className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{item.title}</span>
                <span className="text-muted-foreground block truncate text-xs">{item.desc}</span>
              </span>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
