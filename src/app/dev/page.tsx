import { UpgradeNotice } from "@/features/billing/components/upgrade-notice";
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
        <UpgradeNotice title={t.upgradeTitle} message={t.upgradeMessage} cta={t.upgradeCta} />
      ) : (
        <AgentConnectPanel devices={devices ?? []} />
      )}
    </div>
  );
}
