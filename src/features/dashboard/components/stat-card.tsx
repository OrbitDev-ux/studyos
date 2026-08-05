import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="bg-muted flex size-9 items-center justify-center rounded-full">
          <Icon className="text-muted-foreground size-4" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
