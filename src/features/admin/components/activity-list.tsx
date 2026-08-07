import { Badge } from "@/components/ui/badge";
import type { ActivityRow } from "@/features/admin/queries";
import { formatRelative } from "@/features/admin/format";

const DESTRUCTIVE_ACTIONS = new Set([
  "error",
  "login_failed",
  "user_ban",
  "admin_delete",
  "ip_block",
]);

export function ActivityList({
  rows,
  emptyLabel = "기록이 없습니다.",
}: {
  rows: ActivityRow[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-border divide-y">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 py-2.5">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  DESTRUCTIVE_ACTIONS.has(row.action) ? "destructive" : "secondary"
                }
              >
                {row.actionLabel}
              </Badge>
              {row.adminName && (
                <span className="text-muted-foreground truncate text-xs">
                  {row.adminName}
                </span>
              )}
            </div>
            {row.detail && (
              <p className="text-muted-foreground truncate text-xs" title={row.detail}>
                {row.detail}
              </p>
            )}
          </div>
          <time
            className="text-muted-foreground shrink-0 text-xs"
            dateTime={row.createdAt.toISOString()}
          >
            {formatRelative(row.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
