import { Settings } from "lucide-react";
import { getMyDevices } from "@/features/dev/agent-actions";
import { DevSettingsForm } from "@/features/dev/components/dev-settings-form";
import { DevicePermissionsPanel } from "@/features/dev/components/device-permissions-panel";
import { getMyWorkspace, parseDevSettings } from "@/features/dev/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevSettingsPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const workspace = await getMyWorkspace(user.id);
  const { devices } = await getMyDevices();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
          <Settings className="size-5" /> {t.settingsTitle}
        </h1>
        <DevSettingsForm initial={parseDevSettings(workspace?.settings)} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-muted-foreground font-mono text-[10px] tracking-widest">DEVICE PERMISSIONS</h2>
        <DevicePermissionsPanel devices={devices ?? []} />
      </div>
    </div>
  );
}
