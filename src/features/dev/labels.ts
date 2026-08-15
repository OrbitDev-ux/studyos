import type { Messages } from "@/features/i18n/messages";
import type { WorkspaceStatus } from "@/features/dev/config";

export function workspaceStatusLabel(t: Messages["dev"], status: string): string {
  const map: Record<WorkspaceStatus, string> = {
    NOT_PROVISIONED: t.statusNotProvisioned,
    CREATING: t.statusCreating,
    READY: t.statusReady,
    RUNNING: t.statusRunning,
    IDLE: t.statusIdle,
    STOPPED: t.statusStopped,
    ERROR: t.statusError,
  };
  return map[status as WorkspaceStatus] ?? status;
}
