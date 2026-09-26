import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function FairUseNotice({
  title,
  message,
  className,
}: {
  title: string;
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "bg-muted/60 flex flex-col gap-1.5 rounded-lg border p-4",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Info className="text-muted-foreground size-4" aria-hidden />
        {title}
      </p>
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );
}
