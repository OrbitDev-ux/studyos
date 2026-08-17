import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Messages } from "@/features/i18n/messages";

export function StatsEmptyState({ t }: { t: Messages["stats"] }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <span className="bg-muted flex size-11 items-center justify-center rounded-full">
        <BarChart3 className="text-muted-foreground size-5" />
      </span>
      <p className="text-sm font-medium">{t.emptyStateTitle}</p>
      <p className="text-muted-foreground max-w-xs text-sm">{t.emptyStateDesc}</p>
      <Button asChild size="sm" className="mt-1">
        <Link href="/dashboard">{t.emptyStateCta}</Link>
      </Button>
    </div>
  );
}
