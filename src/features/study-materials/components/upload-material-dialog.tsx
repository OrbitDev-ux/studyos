"use client";

import { Plus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subject } from "@/generated/prisma/client";
import { useI18n } from "@/features/i18n/provider";
import { confirmUpload, createUploadTarget } from "@/features/study-materials/actions";
import { MAX_FILE_SIZE_BYTES } from "@/features/study-materials/constants";
import { FolderPicker } from "@/features/study-materials/components/folder-picker";
import type { FlatFolder } from "@/features/study-materials/folder-tree";
import { deriveMaterialType, resolveMimeType } from "@/features/study-materials/filename";
import { uploadFileWithProgress } from "@/features/study-materials/upload-client";

const ACCEPT = ".pdf,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif";

type Stage = "idle" | "uploading" | "error";

export function UploadMaterialDialog({
  subjects,
  folders,
  currentFolderId,
}: {
  subjects: Subject[];
  folders: FlatFolder[];
  currentFolderId: string | null;
}) {
  const { messages } = useI18n();
  const t = messages.materials;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [folderId, setFolderId] = useState<string | null>(currentFolderId);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setName("");
    setSubjectId(undefined);
    setFolderId(currentFolderId);
    setStage("idle");
    setProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_FILE_SIZE_BYTES) {
      setError(t.uploadErrorTooLarge);
      setFile(null);
      return;
    }
    const mimeType = resolveMimeType(picked.name, picked.type);
    if (!deriveMaterialType(mimeType)) {
      setError(t.uploadErrorUnsupportedType);
      setFile(null);
      return;
    }
    setFile(picked);
    setName((prev) => (prev ? prev : picked.name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStage("uploading");
    setError(null);

    try {
      const target = await createUploadTarget({
        name: name.trim() || file.name,
        mimeType: file.type,
        size: file.size,
        subjectId,
        folderId: folderId ?? undefined,
      });

      await uploadFileWithProgress(target.signedUrl, file, setProgress);
      await confirmUpload(target.materialId);

      setOpen(false);
      reset();
    } catch {
      setStage("error");
      setError(t.uploadErrorGeneric);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" data-icon="inline-start">
          <Plus className="size-4" />
          {t.addMaterial}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.uploadDialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="material-file">{t.uploadFileLabel}</Label>
            <Input
              id="material-file"
              type="file"
              ref={fileInputRef}
              accept={ACCEPT}
              onChange={handleFileChange}
              disabled={stage === "uploading"}
            />
          </div>

          {file && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="material-name">{t.uploadNameLabel}</Label>
              <Input
                id="material-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={stage === "uploading"}
                maxLength={150}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{t.uploadSubjectLabel}</Label>
            <Select
              value={subjectId ?? "__none__"}
              onValueChange={(v) => setSubjectId(v === "__none__" ? undefined : v)}
              disabled={stage === "uploading"}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.uploadSubjectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t.uploadSubjectPlaceholder}</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t.uploadFolderLabel}</Label>
            <FolderPicker
              folders={folders}
              value={folderId}
              onChange={setFolderId}
              rootLabel={t.breadcrumbRoot}
              placeholder={t.breadcrumbRoot}
            />
          </div>

          {stage === "uploading" && (
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Upload className="size-3.5" />
                {t.uploading}
              </p>
              <Progress value={progress} />
            </div>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={!file || stage === "uploading"}>
              {t.uploadSubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
