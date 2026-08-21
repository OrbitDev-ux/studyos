import { TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusDashboard } from "@/features/admin/components/status-dashboard";
import {
  DangerousActions,
  MaintenanceControl,
} from "@/features/admin/components/system-controls";
import { getSystemStatus } from "@/features/admin/system-queries";
import { getSystemHealth } from "@/features/admin/status";
import { getServerLocale } from "@/features/i18n/server";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminSystemPage() {
  await requireCapability("manageSystem");
  const [status, health, locale] = await Promise.all([
    getSystemStatus(),
    getSystemHealth(),
    getServerLocale(),
  ]);

  return (
    <>
      <AdminPageHeader title="시스템" description="서비스 상태 및 운영 제어" />

      <StatusDashboard initial={health} locale={locale} />

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
            title={status.maintenanceTitle}
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
