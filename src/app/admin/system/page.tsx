import { Database, Gauge, Server, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  DangerousActions,
  MaintenanceControl,
} from "@/features/admin/components/system-controls";
import { getSystemStatus, type ServiceStatus } from "@/features/admin/system-queries";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

function StatusBadge({ status }: { status: ServiceStatus }) {
  return status === "ok" ? (
    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
      정상
    </Badge>
  ) : (
    <Badge variant="destructive">오류</Badge>
  );
}

export default async function AdminSystemPage() {
  await requireCapability("manageSystem");
  const status = await getSystemStatus();

  const services = [
    { label: "서비스", value: <StatusBadge status={status.server} />, icon: Gauge },
    { label: "서버", value: <StatusBadge status={status.server} />, icon: Server },
    {
      label: "데이터베이스",
      value: <StatusBadge status={status.database} />,
      icon: Database,
    },
    { label: "캐시", value: <StatusBadge status={status.cache} />, icon: Gauge },
  ];

  return (
    <>
      <AdminPageHeader title="시스템" description="서비스 상태 및 운영 제어" />

      {/* Status grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <s.icon className="text-muted-foreground size-4" />
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {s.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>버전 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs">앱 버전</dt>
              <dd className="text-sm font-medium tabular-nums">v{status.version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Node</dt>
              <dd className="text-sm font-medium tabular-nums">{status.nodeVersion}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">환경</dt>
              <dd className="text-sm font-medium">{status.environment}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>점검모드</CardTitle>
        </CardHeader>
        <CardContent>
          <MaintenanceControl
            enabled={status.maintenanceMode}
            message={status.maintenanceMessage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="text-destructive size-4" />
            위험 작업
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DangerousActions />
        </CardContent>
      </Card>
    </>
  );
}
