import { FolderTree } from "lucide-react";
import { getMyDevices } from "@/features/dev/agent-actions";
import { AgentGate } from "@/features/dev/components/agent-gate";
import { FilesView } from "@/features/dev/components/files-view";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevFilesPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const { devices } = await getMyDevices();

  return (
    <AgentGate devices={devices ?? []} icon={FolderTree} title={t.filesTitle}>
      {(ctx) => <FilesView deviceId={ctx.deviceId} workspaceId={ctx.workspaceId} />}
    </AgentGate>
  );
}
