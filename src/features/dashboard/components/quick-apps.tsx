import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navItems } from "@/config/nav";
import type { Messages } from "@/features/i18n/messages";

/** Curated subset of the sidebar's own nav items — never a second icon/label
 * source to keep in sync. Settings/support are deliberately left out: they
 * already have a clear, unduplicated entry point (the sidebar's account
 * menu), so repeating them here would just be a second path to the same
 * place rather than a genuinely quick "app". Fixed at 4 columns (not a
 * viewport breakpoint) since this card now lives in a narrow sidebar column
 * on desktop as often as it's full-width on mobile — a viewport-based
 * breakpoint would size it for the wrong container. */
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
    <Card>
      <CardHeader>
        <CardTitle>{messages.dashboard.quickAppsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-1">
          {apps.map((app) => (
            <Link
              key={app.href}
              href={app.href}
              className="hover:bg-muted focus-visible:ring-ring group flex flex-col items-center gap-1 rounded-lg py-2 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-muted group-hover:bg-background flex size-9 items-center justify-center rounded-lg transition-colors">
                <app.icon className="text-foreground size-4" />
              </span>
              <span className="text-muted-foreground w-full truncate text-[10px]">
                {messages.nav[app.key]}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
