import { Code2 } from "lucide-react";
import { BackendUnavailable } from "@/features/dev/components/backend-unavailable";
import { IdeWorkspace } from "@/features/dev/components/ide-workspace";
import { getMyWorkspace, parseDevSettings } from "@/features/dev/queries";
import { isRuntimeConfigured } from "@/features/dev/runtime-client";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevIdePage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;

  if (!isRuntimeConfigured()) {
    return (
      <BackendUnavailable
        icon={Code2}
        title={t.ideTitle}
        unavailableTitle={t.backendUnavailableTitle}
        unavailableDesc={t.backendUnavailableDesc}
      />
    );
  }

  const workspace = await getMyWorkspace(user.id);
  const settings = parseDevSettings(workspace?.settings);
  return (
    <IdeWorkspace settings={{ editorTheme: settings.editorTheme, wordWrap: settings.wordWrap, minimap: settings.minimap }} />
  );
}
