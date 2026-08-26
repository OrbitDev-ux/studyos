import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared page title block for every (app) route. Consolidates the
 * near-identical `<h1>` + optional subtitle/icon/trailing-actions markup that
 * ~25 pages previously hand-rolled with tiny variations (some responsive
 * `text-xl sm:text-2xl`, some fixed `text-2xl`; some with a raw emoji instead
 * of an icon) — one place to keep page-title typography consistent going
 * forward instead of a new one-off per page.
 */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* min-w-0: this sits next to `actions` in a flex row at sm+, so a long
          title (a support ticket subject, a battle name, …) can wrap/shrink
          instead of forcing the row to overflow — the same reason the pages
          this replaces each carried it individually. */}
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          {Icon && <Icon className="size-5 shrink-0" aria-hidden />}
          {title}
        </h1>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full shrink-0 gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}
