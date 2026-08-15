"use client";

import Editor from "@monaco-editor/react";
import { FolderTree, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileExplorer } from "@/features/dev/components/file-explorer";
import { languageForFile } from "@/features/dev/file-icons";
import { readWorkspaceFile, writeWorkspaceFile } from "@/features/dev/runtime-actions";
import { useI18n } from "@/features/i18n/provider";

/** `/dev/files` — directory tree + create/rename/delete (§18), with a simple
 * single-file preview/edit pane (the full tabbed editor lives at `/dev/ide`,
 * §19, reusing the SAME FileExplorer component so both stay on one filesystem). */
export function FilesView() {
  const { messages } = useI18n();
  const t = messages.dev;
  const [path, setPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open(p: string) {
    setError(null);
    const res = await readWorkspaceFile(p);
    if (res.error || res.content === undefined) {
      setError(res.error ?? "Failed to open file.");
      return;
    }
    setPath(p);
    setContent(res.content);
    setDirty(false);
  }

  async function save() {
    if (!path) return;
    const res = await writeWorkspaceFile(path, content);
    if (res.error) setError(res.error);
    else setDirty(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-2">
      <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
        <FolderTree className="size-5" /> {t.filesTitle}
      </h1>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="flex min-h-0 flex-1 gap-2">
        <aside className="w-64 shrink-0 overflow-hidden rounded-lg border p-1.5">
          <FileExplorer onOpenFile={(p) => void open(p)} activePath={path ?? undefined} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
          {path ? (
            <>
              <div className="bg-muted/40 flex items-center justify-between border-b px-3 py-1.5">
                <span className="truncate font-mono text-xs">{path}</span>
                <Button type="button" size="sm" variant="outline" disabled={!dirty} onClick={save} className="gap-1.5">
                  <Save className="size-3.5" /> {t.settingsSave}
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <Editor
                  path={path}
                  language={languageForFile(path.split("/").pop() ?? "")}
                  value={content}
                  onChange={(value) => {
                    setContent(value ?? "");
                    setDirty(true);
                  }}
                  options={{ fontSize: 13, automaticLayout: true }}
                />
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              {t.noFileSelected}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
