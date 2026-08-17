"use client";

import { Download, FolderInput, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  deleteMaterial,
  getMaterialDownloadUrl,
  moveMaterial,
  renameMaterial,
} from "@/features/study-materials/actions";
import { MaterialIcon } from "@/features/study-materials/components/material-icon";
import { MaterialPreviewDialog } from "@/features/study-materials/components/material-preview-dialog";
import { MoveDialog } from "@/features/study-materials/components/move-dialog";
import { RenameDialog } from "@/features/study-materials/components/rename-dialog";
import type { FlatFolder } from "@/features/study-materials/folder-tree";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import { formatFileSize } from "@/lib/format";

export type MaterialRowData = {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  subject: { id: string; name: string; color: string } | null;
};

export function MaterialRow({
  material,
  allFolders,
}: {
  material: MaterialRowData;
  allFolders: FlatFolder[];
}) {
  const { messages } = useI18n();
  const t = messages.materials;
  const [isPending, startTransition] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDownload() {
    const url = await getMaterialDownloadUrl(material.id);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <MaterialIcon type={material.type} className="text-muted-foreground shrink-0" />
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
      >
        {material.name}
      </button>
      {material.subject && (
        <SubjectChip
          name={material.subject.name}
          color={material.subject.color}
          className="shrink-0"
        />
      )}
      <span className="text-muted-foreground hidden shrink-0 text-xs tabular-nums sm:inline">
        {formatFileSize(material.size)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t.menuLabel}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              startTransition(handleDownload);
            }}
            disabled={isPending}
          >
            <Download className="size-4" />
            {t.download}
          </DropdownMenuItem>
          <RenameDialog
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="size-4" />
                {t.rename}
              </DropdownMenuItem>
            }
            title={t.renameMaterialTitle}
            initialName={material.name}
            maxLength={150}
            onRename={(name) => renameMaterial({ materialId: material.id, name })}
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
            onMove={(target) => moveMaterial(material.id, target)}
          />
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
                <AlertDialogTitle>{t.deleteMaterialTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.deleteMaterialDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    startTransition(async () => {
                      await deleteMaterial(material.id);
                      setDeleteOpen(false);
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

      <MaterialPreviewDialog
        material={material}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
