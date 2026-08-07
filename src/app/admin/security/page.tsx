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
  BlockIpForm,
  ClearSessionsButton,
  UnblockButton,
} from "@/features/admin/components/security-controls";
import { formatDateTime } from "@/features/admin/format";
import {
  getAdminLoginHistory,
  getBlockedIps,
  getFailedLoginAttempts,
} from "@/features/admin/security-queries";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminSecurityPage() {
  await requireCapability("manageSecurity");
  const [logins, failures, blocked] = await Promise.all([
    getAdminLoginHistory(15),
    getFailedLoginAttempts(15),
    getBlockedIps(),
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
          <BlockIpForm />
          {blocked.length === 0 ? (
            <p className="text-muted-foreground text-sm">차단된 IP가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead className="hidden sm:table-cell">사유</TableHead>
                  <TableHead className="hidden md:table-cell">차단일</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocked.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.ip}</TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs sm:table-cell">
                      {b.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                      {formatDateTime(b.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <UnblockButton id={b.id} ip={b.ip} />
                    </TableCell>
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
