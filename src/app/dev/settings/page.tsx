import { Settings } from "lucide-react";
import { DevSettingsForm } from "@/features/dev/components/dev-settings-form";
import { getMyWorkspace, parseDevSettings } from "@/features/dev/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevSettingsPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const workspace = await getMyWorkspace(user.id);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
        <Settings className="size-5" /> {t.settingsTitle}
      </h1>
      <DevSettingsForm initial={parseDevSettings(workspace?.settings)} />
    </div>
  );
}
