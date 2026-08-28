"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, Eye, FolderTree, GitBranch, Play, Terminal, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { renameDevice, revokeDevice } from "@/features/dev/agent-actions";
import type { DeviceSummary } from "@/features/dev/agent-queries";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/dev/ide", label: "IDE", icon: Code2 },
  { href: "/dev/terminal", label: "Terminal", icon: Terminal },
  { href: "/dev/files", label: "Files", icon: FolderTree },
  { href: "/dev/run", label: "Run", icon: Play },
  { href: "/dev/preview", label: "Preview", icon: Eye },
  { href: "/dev/git", label: "Git", icon: GitBranch },
];

/**
 * `/dev` home — real device pairing/management (§21, §24): renaming and
 * revoking genuinely write DevAgentDevice (a reload shows the same list).
 * "Connected" reflects a heartbeat received within the last 45s, not just
 * that a device was paired at some point.
 */
export function AgentConnectPanel({ devices }: { devices: DeviceSummary[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function saveRename(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await renameDevice(id, renameValue);
      if (res.error) {
        setError(res.error);
        return;
      }
      setRenamingId(null);
      router.refresh();
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      await revokeDevice(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-muted-foreground font-mono text-[10px] tracking-widest">DEVICES</CardTitle>
          <Button asChild size="sm">
            <Link href="/dev/pair">Pair a computer</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && <p className="text-destructive text-xs">{error}</p>}
          {devices.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
              <p>No computer is paired yet.</p>
              <p className="max-w-sm text-xs">
                Install and run <code className="bg-muted rounded px-1 py-0.5 font-mono">studyos-dev login</code> on
                your computer, then pair it here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn("size-2 shrink-0 rounded-full", d.online ? "bg-success" : "bg-muted-foreground/40")}
                      aria-hidden
                    />
                    {renamingId === d.id ? (
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename(d.id)}
                        onBlur={() => saveRename(d.id)}
                        autoFocus
                        className="h-7 font-mono text-xs"
                        disabled={pending}
                      />
                    ) : (
                      <button
                        type="button"
                        className="truncate text-left font-mono text-sm"
                        onClick={() => {
                          setRenamingId(d.id);
                          setRenameValue(d.name);
                        }}
                      >
                        {d.name}
                      </button>
                    )}
                    {d.platform && (
                      <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                        {d.platform}
                      </Badge>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove device" disabled={pending}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect &ldquo;{d.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          StudyOS will stop accepting sessions from this device. The agent process itself keeps
                          running on that computer until you also stop it there.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revoke(d.id)}>Disconnect</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {devices.some((d) => d.online) && (
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.href} asChild size="sm" variant="outline" className="gap-1.5">
              <Link href={action.href}>
                <action.icon className="size-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
