import { Terminal } from "lucide-react";
import { BackendUnavailable } from "@/features/dev/components/backend-unavailable";
import { TerminalView } from "@/features/dev/components/terminal-view";
import { isRuntimeConfigured } from "@/features/dev/runtime-client";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevTerminalPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;

  if (!isRuntimeConfigured()) {
    return (
      <BackendUnavailable
        icon={Terminal}
        title={t.terminalTitle}
        unavailableTitle={t.backendUnavailableTitle}
        unavailableDesc={t.backendUnavailableDesc}
      />
    );
  }

  return <TerminalView title={t.terminalTitle} />;
}
