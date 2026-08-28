import { Play } from "lucide-react";
import { getMyDevices } from "@/features/dev/agent-actions";
import { AgentGate } from "@/features/dev/components/agent-gate";
import { RunView } from "@/features/dev/components/run-view";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevRunPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const { devices } = await getMyDevices();

  return (
    <AgentGate devices={devices ?? []} icon={Play} title={t.runTitle}>
      {(ctx) => <RunView deviceId={ctx.deviceId} workspaceId={ctx.workspaceId} />}
    </AgentGate>
  );
}
