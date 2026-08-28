"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { setPermissionGrant } from "@/features/dev/agent-actions";
import { DEV_GRANTABLE_PERMISSIONS, type DevPermission } from "@/features/dev/agent-config";
import type { DeviceSummary } from "@/features/dev/agent-queries";
import { cn } from "@/lib/utils";

const PERMISSION_LABELS: Record<DevPermission, string> = {
  "dev.workspace.read": "Read files",
  "dev.workspace.write": "Write files",
  "dev.terminal.execute": "Terminal",
  "dev.git.read": "Git status/diff",
  "dev.git.write": "Git commit",
  "dev.preview.start": "Start dev servers",
};

/**
 * §21 permission UI — read scopes are always-on and shown as such; every
 * grantable scope defaults to off until the user flips it here, and flipping
 * it off takes effect on the device's very next session (agent/verify-
 * session re-checks the grant server-side on every new connection).
 */
export function DevicePermissionsPanel({ devices }: { devices: DeviceSummary[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (devices.length === 0) return null;

  function toggle(deviceId: string, permission: DevPermission, next: boolean) {
    startTransition(async () => {
      await setPermissionGrant(deviceId, permission, next);
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      {devices.map((device) => (
        <Card key={device.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="font-mono text-sm">{device.name}</CardTitle>
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className={cn("size-2 rounded-full", device.online ? "bg-success" : "bg-muted-foreground/40")} />
              {device.online ? "Connected" : "Disconnected"}
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Check className="size-3.5" /> Read files, git status/diff — always allowed
            </div>
            {DEV_GRANTABLE_PERMISSIONS.map((permission) => (
              <div key={permission} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm">
                  {!device.grants[permission] && <ShieldAlert className="text-warning size-3.5" />}
                  {PERMISSION_LABELS[permission]}
                </span>
                <Switch
                  checked={device.grants[permission]}
                  disabled={pending}
                  onCheckedChange={(v) => toggle(device.id, permission, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
