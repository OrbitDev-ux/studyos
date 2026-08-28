import { PairApprovalPanel } from "@/features/dev/components/pair-approval-panel";
import { requireCurrentUser } from "@/lib/session";

export default async function DevPairPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  await requireCurrentUser();
  const { code } = await searchParams;
  return <PairApprovalPanel initialCode={code} />;
}
