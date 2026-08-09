import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reusable, non-intrusive upgrade prompt (no popups). Shown when a plan limit is
 * reached or a gated feature is accessed. Uses the existing design system.
 */
export function UpgradeNotice({
  title,
  message,
  cta = "플랜 비교하기",
  href = "/pricing",
  className,
}: {
  title: string;
  message?: string;
  cta?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-primary/30 bg-primary/5 flex flex-col gap-2 rounded-lg border p-4",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Sparkles className="text-primary size-4" />
        {title}
      </p>
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
      <Button asChild size="sm" className="self-start">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
