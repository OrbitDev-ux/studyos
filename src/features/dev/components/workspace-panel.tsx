"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, Eye, FolderTree, Play, Terminal } from "lucide-react";
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
import { createMyWorkspace, destroyMyWorkspace, renameMyWorkspace } from "@/features/dev/actions";
import { workspaceStatusLabel } from "@/features/dev/labels";
import { useI18n } from "@/features/i18n/provider";
import { cn } from "@/lib/utils";

type WorkspaceSummary = {
  id: string;
  name: string;
  status: string;
  runtime: string | null;
} | null;

/**
 * Dev Home's workspace panel. Everything here is real: creating, renaming, and
 * deleting genuinely reads/writes the DevWorkspace row (§36 persistence — a
 * reload shows the same workspace). The Container/Terminal/Filesystem/IDE
 * status dots are honestly OFF (no backend); only "Workspace" itself is ON,
 * because that row is really persisted in the DB.
 */
export function WorkspacePanel({ workspace }: { workspace: WorkspaceSummary }) {
  const router = useRouter();
  const { messages } = useI18n();
  const t = messages.dev;
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(workspace?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createMyWorkspace({ name: name.trim() || undefined });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function saveRename() {
    setError(null);
    startTransition(async () => {
      const res = await renameMyWorkspace(renameValue);
      if (res.error) {
        setError(res.error);
        return;
      }
      setRenaming(false);
      router.refresh();
    });
  }

  function destroy() {
    startTransition(async () => {
      await destroyMyWorkspace();
      router.refresh();
    });
  }

  if (!workspace) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm font-medium">{t.createWorkspaceTitle}</p>
          <p className="text-muted-foreground text-sm">{t.createWorkspaceDesc}</p>
          <div className="mt-2 flex w-full max-w-xs gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="font-mono"
              disabled={pending}
            />
            <Button type="button" onClick={create} disabled={pending}>
              {t.createWorkspaceCta}
            </Button>
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  const statusItems = [
    { label: t.statusWorkspace, online: true },
    { label: t.statusContainer, online: false },
    { label: t.statusTerminal, online: false },
    { label: t.statusFilesystem, online: false },
    { label: t.statusIde, online: false },
  ];

  const quickActions = [
    { href: "/dev/ide", label: t.openIde, icon: Code2 },
    { href: "/dev/terminal", label: t.openTerminal, icon: Terminal },
    { href: "/dev/files", label: t.openFiles, icon: FolderTree },
    { href: "/dev/run", label: t.openRun, icon: Play },
    { href: "/dev/preview", label: t.openPreview, icon: Eye },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground font-mono text-[10px] tracking-widest">
            {t.systemStatusTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  item.online ? "bg-success" : "bg-muted-foreground/40",
                )}
                aria-hidden
              />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-muted-foreground font-mono text-[10px] tracking-widest">
            {t.workspaceSectionTitle}
          </CardTitle>
          <Badge variant="outline">{workspaceStatusLabel(t, workspace.status)}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {renaming ? (
            <div className="flex gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="font-mono"
                disabled={pending}
                autoFocus
              />
              <Button size="sm" onClick={saveRename} disabled={pending}>
                {t.settingsSave}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono text-lg font-semibold">{workspace.name}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRenameValue(workspace.name);
                  setRenaming(true);
                }}
              >
                {t.renameCta}
              </Button>
            </div>
          )}

          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>{t.runtimeLabel}</span>
            <span className="font-mono">{workspace.runtime ?? "—"}</span>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <div className="mt-1 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button key={action.href} asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={action.href}>
                  <action.icon className="size-4" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive mt-2 self-start"
              >
                {t.destroyCta}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.destroyConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.destroyConfirmDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={destroy}>{messages.common.delete}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
