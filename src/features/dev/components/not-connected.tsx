import Link from "next/link";
import { PlugZap, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Honest connection-state placeholder (§25/§26) — replaces the old
 * BackendUnavailable ("no backend deployed") with the real v2 states: no
 * device paired yet, or a paired device whose agent process isn't reachable
 * right now. Never fakes a working terminal/editor.
 */
export function NotConnected({
  icon: Icon,
  title,
  reasonTitle,
  reasonDesc,
  showPairCta,
}: {
  icon: LucideIcon;
  title: string;
  reasonTitle: string;
  reasonDesc: string;
  showPairCta?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
        <Icon className="size-5" /> {title}
      </h1>
      <Card className="border-dashed">
        <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center">
          <PlugZap className="size-8 opacity-40" />
          <div className="max-w-md">
            <p className="text-foreground text-sm font-medium">{reasonTitle}</p>
            <p className="mt-1 text-sm">{reasonDesc}</p>
          </div>
          {showPairCta && (
            <Button asChild size="sm" className="mt-2">
              <Link href="/dev/pair">Pair this computer</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
