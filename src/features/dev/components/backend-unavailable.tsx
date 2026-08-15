import { PlugZap, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Honest placeholder for IDE/Terminal/Files/Run/Preview/Git (§20, §41): the UI
 * shell is real, but no container/PTY backend is connected in this deployment
 * yet, so it says so plainly instead of faking a working terminal/editor.
 */
export function BackendUnavailable({
  icon: Icon,
  title,
  unavailableTitle,
  unavailableDesc,
}: {
  icon: LucideIcon;
  title: string;
  unavailableTitle: string;
  unavailableDesc: string;
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
            <p className="text-foreground text-sm font-medium">{unavailableTitle}</p>
            <p className="mt-1 text-sm">{unavailableDesc}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
