import { Eye } from "lucide-react";
import { BackendUnavailable } from "@/features/dev/components/backend-unavailable";
import { PreviewView } from "@/features/dev/components/preview-view";
import { isRuntimeConfigured } from "@/features/dev/runtime-client";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevPreviewPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;

  if (!isRuntimeConfigured()) {
    return (
      <BackendUnavailable
        icon={Eye}
        title={t.previewTitle}
        unavailableTitle={t.backendUnavailableTitle}
        unavailableDesc={t.backendUnavailableDesc}
      />
    );
  }

  return <PreviewView title={t.previewTitle} />;
}
