import { Card, CardContent } from "@/components/ui/card";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { getMyDevices } from "@/features/dev/agent-actions";
import { AgentConnectPanel } from "@/features/dev/components/agent-connect-panel";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevHomePage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const canDev = canUseFeature(accessStateFor(user), "DEV_WORKSPACE");
  const { devices } = canDev ? await getMyDevices() : { devices: [] };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-mono text-xl font-semibold tracking-tight">🛠️ {t.homeTitle}</h1>

      {!canDev ? (
        <Card><CardContent className="text-muted-foreground pt-6 text-sm">아직 사용할 수 없는 기능입니다.</CardContent></Card>
      ) : (
        <AgentConnectPanel devices={devices ?? []} />
      )}
    </div>
  );
}
