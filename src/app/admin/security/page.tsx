import { Ban, KeyRound, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  BanRowActions,
  BlockIpForm,
  ClearSessionsButton,
} from "@/features/admin/components/security-controls";
import { formatDateTime } from "@/features/admin/format";
import {
  getAdminLoginHistory,
  getBlockedIps,
  getCurrentIp,
  getFailedLoginAttempts,
} from "@/features/admin/security-queries";
import { requireCapability } from "@/lib/admin/context";
import { can } from "@/lib/admin/permissions";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminSecurityPage() {
  const admin = await requireCapability("manageSecurity");
  const canManageBans = can(admin.role, "manageIpBans");
  const [logins, failures, blocked, currentIp] = await Promise.all([
    getAdminLoginHistory(15),
    getFailedLoginAttempts(15),
    getBlockedIps(),
    getCurrentIp(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="보안"
        description="관리자 로그인 기록, 로그인 실패, IP 차단, 세션 관리"
        action={<ClearSessionsButton />}
      />

      {/* IP blocking */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Ban className="text-muted-foreground size-4" />
            IP 차단
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canManageBans ? (
            <BlockIpForm currentIp={currentIp} />
          ) : (
            <p className="text-muted-foreground text-xs">
              IP 차단/해제는 슈퍼 관리자만 가능합니다. (현재 IP: {currentIp})
            </p>
          )}
          {blocked.length === 0 ? (
            <p className="text-muted-foreground text-sm">차단된 IP가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="hidden sm:table-cell">사유</TableHead>
                  <TableHead className="hidden md:table-cell">만료</TableHead>
                  {canManageBans && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocked.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.ip}</TableCell>
                    <TableCell>
                      {b.effective ? (
                        <Badge variant="destructive">차단중</Badge>
                      ) : b.active ? (
                        <Badge variant="outline">만료됨</Badge>
                      ) : (
                        <Badge variant="secondary">해제됨</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs sm:table-cell">
                      {b.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                      {b.permanent
                        ? "영구"
                        : b.expiresAt
                          ? formatDateTime(b.expiresAt)
                          : "—"}
                    </TableCell>
                    {canManageBans && (
                      <TableCell className="text-right">
                        <BanRowActions
                          ban={{
                            id: b.id,
                            ip: b.ip,
                            reason: b.reason,
                            effective: b.effective,
                          }}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Successful admin logins */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="text-muted-foreground size-4" />
              관리자 로그인 기록
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <AttemptTable rows={logins} emptyLabel="로그인 기록이 없습니다." />
          </CardContent>
        </Card>

        {/* Failed attempts */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="text-destructive size-4" />
              로그인 실패 기록
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <AttemptTable rows={failures} emptyLabel="실패 기록이 없습니다." failure />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AttemptTable({
  rows,
  emptyLabel,
  failure = false,
}: {
  rows: { id: string; ip: string; email: string | null; createdAt: Date }[];
  emptyLabel: string;
  failure?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-6 text-center text-sm">{emptyLabel}</p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>계정</TableHead>
          <TableHead>IP</TableHead>
          <TableHead className="hidden sm:table-cell">시각</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs">
              {r.email ?? (
                <Badge variant={failure ? "destructive" : "outline"}>코드</Badge>
              )}
            </TableCell>
            <TableCell className="font-mono text-xs">{r.ip}</TableCell>
            <TableCell className="text-muted-foreground hidden text-xs sm:table-cell">
              {formatDateTime(r.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
