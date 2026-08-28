import { Terminal } from "lucide-react";
import { getMyDevices } from "@/features/dev/agent-actions";
import { AgentGate } from "@/features/dev/components/agent-gate";
import { TerminalView } from "@/features/dev/components/terminal-view";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevTerminalPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const { devices } = await getMyDevices();

  return (
    <AgentGate devices={devices ?? []} icon={Terminal} title={t.terminalTitle}>
      {(ctx) => <TerminalView title={t.terminalTitle} deviceId={ctx.deviceId} workspaceId={ctx.workspaceId} />}
    </AgentGate>
  );
}
