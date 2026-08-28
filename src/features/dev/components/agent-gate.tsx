"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FolderOpen, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DeviceSummary } from "@/features/dev/agent-queries";
import {
  listAgentWorkspaces,
  pickAgentWorkspace,
  addAgentWorkspacePath,
  pingAgent,
  type AgentWorkspace,
} from "@/features/dev/agent-client";
import { NotConnected } from "@/features/dev/components/not-connected";
import type { LucideIcon } from "lucide-react";

export type AgentContext = { deviceId: string; workspaceId: string; workspaceName: string };

function workspaceStorageKey(deviceId: string): string {
  return `studyos-dev:workspace:${deviceId}`;
}

/**
 * Shared connection gate for every `/dev/{ide,terminal,files,run,preview,git}`
 * page (§24–§26): resolves which paired device to use, live-pings its Local
 * Agent (a device row existing in the DB only means it was paired at some
 * point — it says nothing about whether the process is running right now),
 * and lets the user pick a workspace folder before rendering the real view.
 * Centralizing this here is what keeps each page.tsx a few lines.
 */
export function AgentGate({
  devices,
  icon,
  title,
  children,
}: {
  devices: DeviceSummary[];
  icon: LucideIcon;
  title: string;
  children: (ctx: AgentContext) => ReactNode;
}) {
  const device = devices.find((d) => d.localPort) ?? devices[0];
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [workspaces, setWorkspaces] = useState<AgentWorkspace[] | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!device?.localPort) {
      setReachable(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ok = await pingAgent(`http://127.0.0.1:${device.localPort}`);
      if (cancelled) return;
      setReachable(ok);
      if (!ok) return;
      const res = await listAgentWorkspaces(device.id);
      if (cancelled) return;
      if (res.data) {
        setWorkspaces(res.data.workspaces);
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(workspaceStorageKey(device.id)) : null;
        const match = res.data.workspaces.find((w) => w.id === stored) ?? res.data.workspaces[0];
        if (match) setWorkspaceId(match.id);
      } else {
        setError(res.error ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [device?.id, device?.localPort]);

  if (!device) {
    return (
      <NotConnected
        icon={icon}
        title={title}
        reasonTitle="No computer is paired yet"
        reasonDesc='Run "studyos-dev login" on your computer, then enter the code it prints at /dev/pair.'
        showPairCta
      />
    );
  }

  if (reachable === false) {
    return (
      <NotConnected
        icon={icon}
        title={title}
        reasonTitle="Local Agent is not running"
        reasonDesc={`"${device.name}" is paired, but nothing answered on 127.0.0.1:${device.localPort ?? "?"}. Run "studyos-dev connect" on that computer.`}
      />
    );
  }

  if (reachable === null || (reachable && workspaces === null)) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        Connecting to Local Agent…
      </div>
    );
  }

  const active = workspaces?.find((w) => w.id === workspaceId);
  if (!active) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
          <Laptop className="size-5" /> Choose a workspace
        </h1>
        <Card>
          <CardContent className="flex flex-col gap-3 py-6">
            {workspaces && workspaces.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {workspaces.map((w) => (
                  <Button
                    key={w.id}
                    type="button"
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => {
                      setWorkspaceId(w.id);
                      window.localStorage.setItem(workspaceStorageKey(device.id), w.id);
                    }}
                  >
                    <FolderOpen className="size-4" /> {w.name}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setPending(true);
                  setError(null);
                  void pickAgentWorkspace(device.id).then((res) => {
                    setPending(false);
                    if (res.error || !res.data) {
                      setError(res.error ?? "Could not open a folder picker.");
                      return;
                    }
                    setWorkspaces((prev) => [...(prev ?? []), res.data!.workspace]);
                    setWorkspaceId(res.data!.workspace.id);
                    window.localStorage.setItem(workspaceStorageKey(device.id), res.data!.workspace.id);
                  });
                }}
              >
                Choose Folder…
              </Button>
              <Input
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                placeholder="/absolute/path/to/project"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || !manualPath.trim()}
                onClick={() => {
                  setPending(true);
                  setError(null);
                  void addAgentWorkspacePath(device.id, manualPath.trim()).then((res) => {
                    setPending(false);
                    if (res.error || !res.data) {
                      setError(res.error ?? "Could not add that path.");
                      return;
                    }
                    setWorkspaces((prev) => [...(prev ?? []), res.data!.workspace]);
                    setWorkspaceId(res.data!.workspace.id);
                    setManualPath("");
                    window.localStorage.setItem(workspaceStorageKey(device.id), res.data!.workspace.id);
                  });
                }}
              >
                Add
              </Button>
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children({ deviceId: device.id, workspaceId: active.id, workspaceName: active.name })}</>;
}
