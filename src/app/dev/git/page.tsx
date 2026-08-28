import { GitBranch } from "lucide-react";
import { getMyDevices } from "@/features/dev/agent-actions";
import { AgentGate } from "@/features/dev/components/agent-gate";
import { GitView } from "@/features/dev/components/git-view";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevGitPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const { devices } = await getMyDevices();

  return (
    <AgentGate devices={devices ?? []} icon={GitBranch} title={t.gitTitle}>
      {(ctx) => <GitView deviceId={ctx.deviceId} workspaceId={ctx.workspaceId} />}
    </AgentGate>
  );
}
