import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  SUPPORT_STATUS_IDS,
  SUPPORT_STATUS_LABEL,
  SUPPORT_STATUS_VARIANT,
  SUPPORT_TYPE_LABEL,
} from "@/features/support/constants";
import { getAdminTickets } from "@/features/support/admin-queries";
import { requireCapability } from "@/lib/admin/context";
import type { SupportTicketStatus } from "@/generated/prisma/client";

export const metadata = { robots: { index: false, follow: false } };

function parseStatus(v: string | undefined): SupportTicketStatus | undefined {
  return v && (SUPPORT_STATUS_IDS as string[]).includes(v)
    ? (v as SupportTicketStatus)
    : undefined;
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireCapability("manageSupport");
  const { status: statusParam, q, page: pageParam } = await searchParams;
  const status = parseStatus(statusParam);
  const page = Number(pageParam) || 1;
  const { tickets, total, totalPages } = await getAdminTickets({ status, q, page });

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/support?${qs}` : "/admin/support";
  };

  const filters: { label: string; value?: SupportTicketStatus }[] = [
    { label: "전체" },
    { label: "새 문의", value: "OPEN" },
    { label: "처리 중", value: "IN_PROGRESS" },
    { label: "답변 완료", value: "ANSWERED" },
    { label: "종료", value: "CLOSED" },
  ];

  return (
    <>
      <AdminPageHeader title="문의 관리" description={`총 ${total.toLocaleString()}건의 문의`} />

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const active = status === f.value || (!status && !f.value);
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          if (q) params.set("q", q);
          const qs = params.toString();
          return (
            <Button
              key={f.label}
              asChild
              size="sm"
              variant={active ? "default" : "outline"}
            >
              <Link href={qs ? `/admin/support?${qs}` : "/admin/support"}>{f.label}</Link>
            </Button>
          );
        })}
      </div>

      <form method="get" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="제목 검색"
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" variant="secondary" className="h-9">
          검색
        </Button>
      </form>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead className="hidden md:table-cell">유형</TableHead>
                <TableHead className="hidden md:table-cell">문의자</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="hidden sm:table-cell">최근</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    문의가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/admin/support/${t.id}`} className="hover:underline">
                        <span className="text-sm font-medium">{t.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-muted-foreground text-xs">
                        {SUPPORT_TYPE_LABEL[t.type]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-muted-foreground text-xs">
                        {t.user.name ?? t.user.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SUPPORT_STATUS_VARIANT[t.status]}>
                        {SUPPORT_STATUS_LABEL[t.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground text-xs">
                        {new Date(t.updatedAt).toLocaleDateString("ko-KR")}
                      </span>
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
