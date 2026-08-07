import { Search } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { UserActionsMenu } from "@/features/admin/components/user-actions-menu";
import { formatDateTime } from "@/features/admin/format";
import { getUsers } from "@/features/admin/users-queries";
import { requireAdmin } from "@/lib/admin/context";
import { ROLE_LABELS, can } from "@/lib/admin/permissions";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  const { q, page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const { users, total, totalPages } = await getUsers({ q, page });

  const canBan = can(admin.role, "banUser");
  const canPromote = can(admin.role, "promoteUser");

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <>
      <AdminPageHeader
        title="사용자 관리"
        description={`총 ${total.toLocaleString()}명의 사용자`}
      />

      <form method="get" className="flex gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="이름 또는 이메일 검색"
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
                <TableHead>사용자</TableHead>
                <TableHead className="hidden md:table-cell">가입일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-10 text-center"
                  >
                    사용자가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const initial = (user.name ?? user.email).at(0)?.toUpperCase() ?? "?";
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="flex items-center gap-2.5 hover:underline"
                        >
                          <Avatar className="size-8">
                            <AvatarImage src={user.image ?? undefined} alt="" />
                            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium">
                              {user.name ?? "이름 없음"}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {user.email}
                            </span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                        {formatDateTime(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {user.bannedAt ? (
                            <Badge variant="destructive">정지됨</Badge>
                          ) : (
                            <Badge variant="secondary">활성</Badge>
                          )}
                          {user.isAdmin && user.adminRole && (
                            <Badge variant="outline">{ROLE_LABELS[user.adminRole]}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <UserActionsMenu
                          user={{
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            isBanned: Boolean(user.bannedAt),
                            isAdmin: user.isAdmin,
                          }}
                          canBan={canBan}
                          canPromote={canPromote}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationNav page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
    </>
  );
}
