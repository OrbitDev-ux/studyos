"use client";

import Link from "next/link";
import { Folder, MoreVertical, Pencil, Trash2, FolderInput } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/features/i18n/provider";
import {
  deleteFolder,
  moveFolder,
  renameFolder,
} from "@/features/study-materials/actions";
import { MoveDialog } from "@/features/study-materials/components/move-dialog";
import { RenameDialog } from "@/features/study-materials/components/rename-dialog";
import { descendantIds, type FlatFolder } from "@/features/study-materials/folder-tree";
import { buildStudyMaterialsHref } from "@/features/study-materials/search-params";

export function FolderRow({
  folder,
  allFolders,
}: {
  folder: { id: string; name: string };
  allFolders: FlatFolder[];
}) {
  const { messages } = useI18n();
  const t = messages.materials;
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <Folder className="text-primary size-4 shrink-0" />
      <Link
        href={buildStudyMaterialsHref({ folder: folder.id })}
        className="min-w-0 flex-1 truncate text-sm font-medium"
      >
        {folder.name}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t.menuLabel}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <RenameDialog
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="size-4" />
                {t.rename}
              </DropdownMenuItem>
            }
            title={t.renameFolderTitle}
            initialName={folder.name}
            maxLength={60}
            onRename={(name) => renameFolder({ folderId: folder.id, name })}
          />
          <MoveDialog
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <FolderInput className="size-4" />
                {t.move}
              </DropdownMenuItem>
            }
            title={t.moveTitle}
            folders={allFolders}
            currentFolderId={null}
            excludeIds={descendantIds(allFolders, folder.id)}
            onMove={(target) => moveFolder(folder.id, target)}
          />
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(next) => {
              setDeleteOpen(next);
              if (!next) setDeleteError(null);
            }}
          >
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => e.preventDefault()}
              >
                <Trash2 className="size-4" />
                {t.delete}
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteFolderTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteError ?? t.deleteFolderDesc}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    startTransition(async () => {
                      try {
                        await deleteFolder(folder.id);
                        setDeleteOpen(false);
                      } catch {
                        setDeleteError(t.deleteFolderNotEmpty);
                      }
                    });
                  }}
                >
                  {t.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
