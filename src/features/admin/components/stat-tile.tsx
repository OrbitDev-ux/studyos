import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  accent = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: "default" | "success" | "warning" | "danger";
}) {
  const accentClass = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
  }[accent];

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            accentClass,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-muted-foreground truncate text-xs">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
