import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { getMyOverrideState } from "@/features/billing/admin-override";
import { PlanOverrideForm } from "@/features/billing/components/plan-override-form";
import { requireAdmin } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

/**
 * 플랜 테스트 설정 — admin-only. Lets an admin flip THEIR OWN account's effective
 * plan to test entitlement-gated features, without touching real billing.
 * Gated by requireAdmin (the /admin layout also enforces this); the action layer
 * re-checks and resolves the target strictly from the admin's own email.
 */
export default async function AdminEntitlementPage() {
  await requireAdmin();
  const view = await getMyOverrideState();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="플랜 테스트 설정"
        description="관리자 본인 계정의 적용 플랜을 테스트용으로 오버라이드합니다. 실제 결제/구독 데이터는 변경되지 않습니다."
      />
      <Card>
        <CardContent>
          <PlanOverrideForm view={view} />
        </CardContent>
      </Card>
    </div>
  );
}
