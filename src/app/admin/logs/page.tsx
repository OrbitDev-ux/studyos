import { X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { PaginationNav } from "@/features/admin/components/pagination-nav";
import { formatDateTime } from "@/features/admin/format";
import { getActivityLogs, getAdminOptions } from "@/features/admin/logs-queries";
import { requireCapability } from "@/lib/admin/context";
import { ACTION_LABELS } from "@/lib/admin/activity";

export const metadata = { robots: { index: false, follow: false } };

const DESTRUCTIVE_ACTIONS = new Set([
  "error",
  "login_failed",
  "user_ban",
  "admin_delete",
  "ip_block",
]);

const selectClass =
  "border-input dark:bg-input/30 h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    adminId?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireCapability("viewLogs");
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const [{ rows, total, totalPages }, adminOptions] = await Promise.all([
    getActivityLogs({ ...sp, page }),
    getAdminOptions(),
  ]);

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k !== "page" && v) params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/logs?${qs}` : "/admin/logs";
  };

  const hasFilters = Boolean(sp.action || sp.adminId || sp.from || sp.to || sp.q);

  return (
    <>
      <AdminPageHeader
        title="활동 로그"
        description={`총 ${total.toLocaleString()}건의 기록`}
      />

      <Card>
        <CardContent>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-action" className="text-xs">
                작업 종류
              </Label>
              <select
                id="f-action"
                name="action"
                defaultValue={sp.action ?? ""}
                className={selectClass}
              >
                <option value="">전체</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-admin" className="text-xs">
                관리자
              </Label>
              <select
                id="f-admin"
                name="adminId"
                defaultValue={sp.adminId ?? ""}
                className={selectClass}
              >
                <option value="">전체</option>
                {adminOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-from" className="text-xs">
                시작일
              </Label>
              <Input
                id="f-from"
                type="date"
                name="from"
                defaultValue={sp.from ?? ""}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-to" className="text-xs">
                종료일
              </Label>
              <Input
                id="f-to"
                type="date"
                name="to"
                defaultValue={sp.to ?? ""}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-q" className="text-xs">
                검색
              </Label>
              <Input
                id="f-q"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="상세/IP/대상"
                className="h-9"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
              <Button type="submit" variant="secondary" className="h-9">
                필터 적용
              </Button>
              {hasFilters && (
                <Button asChild variant="ghost" className="h-9">
                  <Link href="/admin/logs">
                    <X className="size-4" />
                    초기화
                  </Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시각</TableHead>
                <TableHead>작업</TableHead>
                <TableHead className="hidden sm:table-cell">관리자</TableHead>
                <TableHead className="hidden lg:table-cell">대상</TableHead>
                <TableHead className="hidden md:table-cell">IP</TableHead>
                <TableHead className="hidden xl:table-cell">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center"
                  >
                    조건에 맞는 기록이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          DESTRUCTIVE_ACTIONS.has(row.action)
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {row.actionLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs sm:table-cell">
                      {row.adminName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {row.targetType
                        ? `${row.targetType}${row.targetId ? `:${row.targetId.slice(0, 8)}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden font-mono text-xs md:table-cell">
                      {row.ip ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-xs truncate text-xs xl:table-cell">
                      <span title={row.detail ?? undefined}>{row.detail ?? "—"}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationNav page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
    </>
  );
}
