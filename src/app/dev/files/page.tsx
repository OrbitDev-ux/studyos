import { FolderTree } from "lucide-react";
import { BackendUnavailable } from "@/features/dev/components/backend-unavailable";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function DevFilesPage() {
  const user = await requireCurrentUser();
  const t = getMessages(await getServerLocale(user.locale)).dev;
  return (
    <BackendUnavailable
      icon={FolderTree}
      title={t.filesTitle}
      unavailableTitle={t.backendUnavailableTitle}
      unavailableDesc={t.backendUnavailableDesc}
    />
  );
}
