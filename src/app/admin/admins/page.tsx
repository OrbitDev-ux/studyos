import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminRowActions } from "@/features/admin/components/admin-row-actions";
import { CreateAdminDialog } from "@/features/admin/components/create-admin-dialog";
import { formatDateTime, formatRelative } from "@/features/admin/format";
import { getAdmins } from "@/features/admin/admins-queries";
import { requireCapability } from "@/lib/admin/context";
import { ROLE_LABELS } from "@/lib/admin/permissions";

export const metadata = { robots: { index: false, follow: false } };

const ROLE_BADGE = {
  SUPER_ADMIN: "default",
  ADMIN: "secondary",
  MODERATOR: "outline",
} as const;

export default async function AdminAdminsPage() {
  // SUPER_ADMIN only — redirects others to the dashboard.
  const current = await requireCapability("manageAdmins");
  const admins = await getAdmins();

  return (
    <>
      <AdminPageHeader
        title="관리자 관리"
        description={`${admins.length}명의 활성 관리자`}
        action={<CreateAdminDialog />}
      />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>관리자</TableHead>
                <TableHead>역할</TableHead>
                <TableHead className="hidden md:table-cell">마지막 로그인</TableHead>
                <TableHead className="hidden lg:table-cell">최근 작업</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const initial = (admin.name ?? admin.email).at(0)?.toUpperCase() ?? "?";
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {admin.name ?? "이름 없음"}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {admin.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGE[admin.role]}>
                        {ROLE_LABELS[admin.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                      {admin.lastLoginAt
                        ? formatDateTime(admin.lastLoginAt)
                        : "기록 없음"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {admin.lastAction
                        ? `${admin.lastAction.label} · ${formatRelative(admin.lastAction.at)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <AdminRowActions
                        admin={{
                          id: admin.id,
                          name: admin.name,
                          email: admin.email,
                          role: admin.role,
                        }}
                        isSelf={admin.id === current.id}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
