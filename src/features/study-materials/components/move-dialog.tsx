"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/features/i18n/provider";
import { FolderPicker } from "@/features/study-materials/components/folder-picker";
import type { FlatFolder } from "@/features/study-materials/folder-tree";

export function MoveDialog({
  trigger,
  title,
  folders,
  currentFolderId,
  excludeIds,
  onMove,
}: {
  trigger: ReactNode;
  title: string;
  folders: FlatFolder[];
  currentFolderId: string | null;
  /** Folder ids to hide (e.g. a folder can't move into itself or its own subtree). */
  excludeIds?: Set<string>;
  onMove: (folderId: string | null) => Promise<void>;
}) {
  const { messages } = useI18n();
  const t = messages.materials;

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(currentFolderId);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onMove(target);
      setOpen(false);
    } catch {
      setError(t.moveError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTarget(currentFolderId);
        setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FolderPicker
            folders={folders}
            value={target}
            onChange={setTarget}
            excludeIds={excludeIds}
            rootLabel={t.moveToRoot}
            placeholder={t.moveToRoot}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {t.moveSubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
