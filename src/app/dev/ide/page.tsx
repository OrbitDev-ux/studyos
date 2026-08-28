import { Code2 } from "lucide-react";
import { getMyDevices } from "@/features/dev/agent-actions";
import { AgentGate } from "@/features/dev/components/agent-gate";
import { IdeWorkspace } from "@/features/dev/components/ide-workspace";
import { getMyWorkspace, parseDevSettings } from "@/features/dev/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevIdePage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const { devices } = await getMyDevices();
  // Editor theme/word-wrap/minimap preferences still live on the old
  // DevWorkspace row (features/dev/schema.ts) — those are pure UI prefs, not
  // container state, so nothing about the v2 Local Agent architecture changes
  // how they're read.
  const workspace = await getMyWorkspace(user.id);
  const settings = parseDevSettings(workspace?.settings);

  return (
    <AgentGate devices={devices ?? []} icon={Code2} title={t.ideTitle}>
      {(ctx) => (
        <IdeWorkspace
          deviceId={ctx.deviceId}
          workspaceId={ctx.workspaceId}
          settings={{ editorTheme: settings.editorTheme, wordWrap: settings.wordWrap, minimap: settings.minimap }}
        />
      )}
    </AgentGate>
  );
}
