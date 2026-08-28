"use client";

import Editor from "@monaco-editor/react";
import { Circle, Terminal as TerminalIcon, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileExplorer } from "@/features/dev/components/file-explorer";
import { TerminalView } from "@/features/dev/components/terminal-view";
import { languageForFile } from "@/features/dev/file-icons";
import { readWorkspaceFile, writeWorkspaceFile } from "@/features/dev/agent-client";
import { useI18n } from "@/features/i18n/provider";
import { cn } from "@/lib/utils";

type Tab = { path: string; content: string; dirty: boolean };

/**
 * `/dev/ide` — File Explorer + Monaco Editor + Tabs + (toggleable) Integrated
 * Terminal (§19/§22/§24), all against the SAME workspace as `/dev/files` and
 * `/dev/terminal` (reuses FileExplorer/TerminalView — no parallel filesystem).
 */
export function IdeWorkspace({
  deviceId,
  workspaceId,
  settings,
}: {
  deviceId: string;
  workspaceId: string;
  settings: { editorTheme: "dark" | "light"; wordWrap: boolean; minimap: boolean };
}) {
  const { messages } = useI18n();
  const t = messages.dev;
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFile = useCallback(
    async (path: string) => {
      setError(null);
      if (tabs.some((tab) => tab.path === path)) {
        setActivePath(path);
        return;
      }
      const res = await readWorkspaceFile(deviceId, workspaceId, path);
      if (res.error || res.data?.content === undefined) {
        setError(res.error ?? "Failed to open file.");
        return;
      }
      setTabs((prev) => [...prev, { path, content: res.data!.content, dirty: false }]);
      setActivePath(path);
    },
    [tabs, deviceId, workspaceId],
  );

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => prev.filter((tab) => tab.path !== path));
      if (activePath === path) {
        const remaining = tabs.filter((tab) => tab.path !== path);
        setActivePath(remaining.length > 0 ? remaining[remaining.length - 1]!.path : null);
      }
    },
    [activePath, tabs],
  );

  const save = useCallback(async () => {
    const tab = tabs.find((t2) => t2.path === activePath);
    if (!tab || !tab.dirty) return;
    const res = await writeWorkspaceFile(deviceId, workspaceId, tab.path, tab.content);
    if (res.error) {
      setError(res.error);
      return;
    }
    setTabs((prev) => prev.map((t2) => (t2.path === tab.path ? { ...t2, dirty: false } : t2)));
  }, [activePath, tabs, deviceId, workspaceId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  const activeTab = tabs.find((tab) => tab.path === activePath) ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-mono text-xl font-semibold tracking-tight">{t.ideTitle}</h1>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setShowTerminal((v) => !v)}>
          <TerminalIcon className="size-4" /> {t.navTerminal}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="flex min-h-0 flex-1 gap-2">
        <aside className="w-56 shrink-0 overflow-hidden rounded-lg border p-1.5">
          <FileExplorer
            deviceId={deviceId}
            workspaceId={workspaceId}
            onOpenFile={(path) => void openFile(path)}
            activePath={activePath ?? undefined}
          />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
            {tabs.length > 0 && (
              <div className="bg-muted/40 flex shrink-0 items-center gap-0.5 overflow-x-auto border-b px-1 py-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.path}
                    type="button"
                    onClick={() => setActivePath(tab.path)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded px-2 py-1 font-mono text-xs",
                      activePath === tab.path ? "bg-background" : "hover:bg-muted",
                    )}
                  >
                    {tab.dirty && <Circle className="size-2 fill-current" />}
                    <span className="max-w-40 truncate">{tab.path.split("/").pop()}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.path);
                      }}
                      className="hover:bg-muted-foreground/20 rounded"
                    >
                      <X className="size-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="min-h-0 flex-1">
              {activeTab ? (
                <Editor
                  path={activeTab.path}
                  language={languageForFile(activeTab.path.split("/").pop() ?? "")}
                  value={activeTab.content}
                  theme={settings.editorTheme === "dark" ? "vs-dark" : "light"}
                  onChange={(value) =>
                    setTabs((prev) =>
                      prev.map((tab) =>
                        tab.path === activeTab.path ? { ...tab, content: value ?? "", dirty: true } : tab,
                      ),
                    )
                  }
                  options={{
                    minimap: { enabled: settings.minimap },
                    wordWrap: settings.wordWrap ? "on" : "off",
                    fontSize: 13,
                    automaticLayout: true,
                  }}
                />
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  {t.noFileSelected}
                </div>
              )}
            </div>
          </div>
          {showTerminal && (
            <div className="h-64 shrink-0 overflow-hidden rounded-lg border">
              <TerminalView title={t.terminalTitle} deviceId={deviceId} workspaceId={workspaceId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
