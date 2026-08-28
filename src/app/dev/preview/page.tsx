import { Eye } from "lucide-react";
import { getMyDevices } from "@/features/dev/agent-actions";
import { AgentGate } from "@/features/dev/components/agent-gate";
import { PreviewView } from "@/features/dev/components/preview-view";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevPreviewPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  const { devices } = await getMyDevices();

  return (
    <AgentGate devices={devices ?? []} icon={Eye} title={t.previewTitle}>
      {() => <PreviewView title={t.previewTitle} />}
    </AgentGate>
  );
}
