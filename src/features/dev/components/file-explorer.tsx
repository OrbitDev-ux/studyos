"use client";

import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  FolderPlus,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  createWorkspaceFolder,
  deleteWorkspaceEntry,
  listWorkspaceFiles,
  renameWorkspaceEntry,
  writeWorkspaceFile,
  type FsEntry,
} from "@/features/dev/agent-client";
import { FOLDER_ICON, iconForFile } from "@/features/dev/file-icons";
import { cn } from "@/lib/utils";

type PendingCreate = { parentPath: string; type: "file" | "dir" } | null;
type PendingRename = { path: string; name: string } | null;

/**
 * `/dev/files` explorer AND the IDE's sidebar (§18/§19 — same component,
 * same workspace) — directory/create/rename/delete all call the runtime
 * through server actions (path-traversal-checked both client- and
 * server-side).
 */
export function FileExplorer({
  deviceId,
  workspaceId,
  onOpenFile,
  activePath,
}: {
  deviceId: string;
  workspaceId: string;
  onOpenFile: (path: string) => void;
  activePath?: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([""]));
  const [children, setChildren] = useState<Record<string, FsEntry[] | undefined>>({});
  const [pendingCreate, setPendingCreate] = useState<PendingCreate>(null);
  const [pendingRename, setPendingRename] = useState<PendingRename>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadDir(path: string) {
    const res = await listWorkspaceFiles(deviceId, workspaceId, path);
    if (res.error) {
      setError(res.error);
      return;
    }
    setChildren((prev) => ({ ...prev, [path]: res.data?.entries ?? [] }));
  }

  useEffect(() => {
    void loadDir("");
  }, []);

  function refresh(path: string) {
    void loadDir(path);
  }

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else {
        next.add(path);
        if (!children[path]) void loadDir(path);
      }
      return next;
    });
  }

  function startCreate(parentPath: string, type: "file" | "dir") {
    setExpanded((prev) => new Set(prev).add(parentPath));
    setPendingCreate({ parentPath, type });
    setDraftName("");
  }

  async function submitCreate() {
    if (!pendingCreate || !draftName.trim()) {
      setPendingCreate(null);
      return;
    }
    const path = pendingCreate.parentPath
      ? `${pendingCreate.parentPath}/${draftName}`
      : draftName;
    const res =
      pendingCreate.type === "dir"
        ? await createWorkspaceFolder(deviceId, workspaceId, path)
        : await writeWorkspaceFile(deviceId, workspaceId, path, "");
    if (res.error) setError(res.error);
    else refresh(pendingCreate.parentPath);
    setPendingCreate(null);
  }

  async function submitRename() {
    if (!pendingRename || !draftName.trim()) {
      setPendingRename(null);
      return;
    }
    const parent = pendingRename.path.includes("/")
      ? pendingRename.path.slice(0, pendingRename.path.lastIndexOf("/"))
      : "";
    const to = parent ? `${parent}/${draftName}` : draftName;
    const res = await renameWorkspaceEntry(deviceId, workspaceId, pendingRename.path, to);
    if (res.error) setError(res.error);
    else refresh(parent);
    setPendingRename(null);
  }

  async function handleDelete(entry: FsEntry, parentPath: string) {
    const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    const res = await deleteWorkspaceEntry(deviceId, workspaceId, path);
    if (res.error) setError(res.error);
    else refresh(parentPath);
  }

  return (
    <div className="flex h-full flex-col gap-1.5 text-sm">
      <div className="flex items-center justify-between gap-1 px-1">
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest">
          /workspace
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="새 파일"
            onClick={() => startCreate("", "file")}
          >
            <FilePlus className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="새 폴더"
            onClick={() => startCreate("", "dir")}
          >
            <FolderPlus className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="새로고침"
            onClick={() => refresh("")}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>
      {error && <p className="text-destructive px-1 text-xs">{error}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DirContents
          path=""
          depth={0}
          entries={children[""]}
          expanded={expanded}
          childrenMap={children}
          activePath={activePath}
          pendingCreate={pendingCreate}
          pendingRename={pendingRename}
          draftName={draftName}
          onDraftNameChange={setDraftName}
          onSubmitCreate={submitCreate}
          onSubmitRename={submitRename}
          onToggle={toggle}
          onOpenFile={onOpenFile}
          onStartCreate={startCreate}
          onStartRename={(path, name) => {
            setPendingRename({ path, name });
            setDraftName(name);
          }}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

function DirContents(props: {
  path: string;
  depth: number;
  entries: FsEntry[] | undefined;
  expanded: Set<string>;
  childrenMap: Record<string, FsEntry[] | undefined>;
  activePath?: string;
  pendingCreate: PendingCreate;
  pendingRename: PendingRename;
  draftName: string;
  onDraftNameChange: (v: string) => void;
  onSubmitCreate: () => void;
  onSubmitRename: () => void;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
  onStartCreate: (parentPath: string, type: "file" | "dir") => void;
  onStartRename: (path: string, name: string) => void;
  onDelete: (entry: FsEntry, parentPath: string) => void;
}) {
  const {
    path,
    depth,
    entries,
    expanded,
    childrenMap,
    activePath,
    pendingCreate,
    pendingRename,
    draftName,
    onDraftNameChange,
    onSubmitCreate,
    onSubmitRename,
    onToggle,
    onOpenFile,
    onStartCreate,
    onStartRename,
    onDelete,
  } = props;

  if (entries === undefined) {
    return <p className="text-muted-foreground px-3 py-1 text-xs">...</p>;
  }

  return (
    <ul>
      {entries.map((entry) => {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        const isDir = entry.type === "dir";
        const isExpanded = expanded.has(entryPath);
        const { icon: Icon, className } = isDir ? FOLDER_ICON : iconForFile(entry.name);
        const isRenaming = pendingRename?.path === entryPath;

        return (
          <li key={entryPath}>
            <div
              className={cn(
                "group hover:bg-muted flex items-center gap-1 rounded px-1 py-1",
                activePath === entryPath && "bg-primary/10",
              )}
              style={{ paddingLeft: `${depth * 14 + 4}px` }}
            >
              {isDir ? (
                <button
                  type="button"
                  onClick={() => onToggle(entryPath)}
                  className="flex items-center gap-1 truncate text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0" />
                  )}
                  <Icon className={cn("size-3.5 shrink-0", className)} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenFile(entryPath)}
                  className="flex min-w-0 flex-1 items-center gap-1 truncate text-left"
                >
                  <span className="w-3.5 shrink-0" />
                  <Icon className={cn("size-3.5 shrink-0", className)} />
                </button>
              )}
              {isRenaming ? (
                <Input
                  autoFocus
                  value={draftName}
                  onChange={(e) => onDraftNameChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSubmitRename()}
                  onBlur={onSubmitRename}
                  className="h-6 flex-1 px-1 text-xs"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => (isDir ? onToggle(entryPath) : onOpenFile(entryPath))}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  {entry.name}
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="더보기"
                    className="size-5 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isDir && (
                    <>
                      <DropdownMenuItem onClick={() => onStartCreate(entryPath, "file")}>
                        <FilePlus className="size-3.5" /> New file
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStartCreate(entryPath, "dir")}>
                        <FolderPlus className="size-3.5" /> New folder
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onStartRename(entryPath, entry.name)}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(entry, path)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isDir && isExpanded && (
              <DirContents
                {...props}
                path={entryPath}
                depth={depth + 1}
                entries={childrenMap[entryPath]}
              />
            )}
          </li>
        );
      })}
      {pendingCreate?.parentPath === path && (
        <li style={{ paddingLeft: `${(depth + 1) * 14 + 4}px` }} className="py-1">
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => onDraftNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmitCreate()}
            onBlur={onSubmitCreate}
            placeholder={pendingCreate.type === "dir" ? "folder-name" : "file-name.ts"}
            className="h-6 px-1 text-xs"
          />
        </li>
      )}
    </ul>
  );
}
