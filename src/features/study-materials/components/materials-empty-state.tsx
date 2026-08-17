import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

export function MaterialsEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <span className="bg-muted flex size-11 items-center justify-center rounded-full">
        <BookOpen className="text-muted-foreground size-5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground max-w-xs text-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
