import { Play } from "lucide-react";
import { BackendUnavailable } from "@/features/dev/components/backend-unavailable";
import { RunView } from "@/features/dev/components/run-view";
import { isRuntimeConfigured } from "@/features/dev/runtime-client";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevRunPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;

  if (!isRuntimeConfigured()) {
    return (
      <BackendUnavailable
        icon={Play}
        title={t.runTitle}
        unavailableTitle={t.backendUnavailableTitle}
        unavailableDesc={t.backendUnavailableDesc}
      />
    );
  }

  return <RunView />;
}
