import Link from "next/link";
import { navItems } from "@/config/nav";
import type { Messages } from "@/features/i18n/messages";

/** Curated subset of the sidebar's own nav items — never a second icon/label
 * source to keep in sync. Settings/support are deliberately left out: they
 * already have a clear, unduplicated entry point (the sidebar's account
 * menu), so repeating them here would just be a second path to the same
 * place rather than a genuinely quick "app". */
const QUICK_APP_HREFS = [
  "/tutor",
  "/problems",
  "/review",
  "/mock-exam",
  "/social",
  "/growth",
  "/study-materials",
  "/study-books",
] as const;

export function QuickApps({ messages }: { messages: Messages }) {
  const apps = QUICK_APP_HREFS.map((href) => navItems.find((item) => item.href === href)).filter(
    (item) => item != null,
  );
  if (apps.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {messages.dashboard.quickAppsTitle}
      </h2>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {apps.map((app) => (
          <Link
            key={app.href}
            href={app.href}
            className="hover:bg-muted focus-visible:ring-ring group flex flex-col items-center gap-1.5 rounded-lg px-1.5 py-2.5 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="bg-muted group-hover:bg-background flex size-10 items-center justify-center rounded-xl transition-colors">
              <app.icon className="text-foreground size-5" />
            </span>
            <span className="text-muted-foreground w-full truncate text-[11px]">
              {messages.nav[app.key]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
