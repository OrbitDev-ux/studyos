import { UpgradeNotice } from "@/features/billing/components/upgrade-notice";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { WorkspacePanel } from "@/features/dev/components/workspace-panel";
import { getMyWorkspace } from "@/features/dev/queries";
import { isRuntimeConfigured } from "@/features/dev/runtime-client";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevHomePage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const canDev = canUseFeature(accessStateFor(user), "DEV_WORKSPACE");
  const workspace = canDev ? await getMyWorkspace(user.id) : null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-mono text-xl font-semibold tracking-tight">🛠️ {t.homeTitle}</h1>

      {!canDev ? (
        <UpgradeNotice title={t.upgradeTitle} message={t.upgradeMessage} cta={t.upgradeCta} />
      ) : (
        <WorkspacePanel
          workspace={
            workspace
              ? {
                  id: workspace.id,
                  name: workspace.name,
                  status: workspace.status,
                  runtime: workspace.runtime,
                }
              : null
          }
          runtimeConfigured={isRuntimeConfigured()}
        />
      )}
    </div>
  );
}
