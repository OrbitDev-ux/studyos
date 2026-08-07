"use client";

import { MoreHorizontal, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import {
  deleteAnnouncement,
  toggleAnnouncementPin,
} from "@/features/admin/announcement-actions";
import { AnnouncementEditor } from "@/features/admin/components/announcement-editor";
import type { AnnouncementRow } from "@/features/admin/announcements-queries";

export function NewAnnouncementButton({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />새 공지
      </Button>
      <AnnouncementEditor open={open} onOpenChange={setOpen} />
    </>
  );
}

export function AnnouncementRowActions({
  announcement,
}: {
  announcement: AnnouncementRow;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<{ error?: string }>, success: string) {
    setPending(true);
    try {
      const result = await fn();
      if (result?.error) {
        toast({ title: "실패", description: result.error, variant: "error" });
        return;
      }
      toast({ title: success, variant: "success" });
      setDeleteOpen(false);
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="공지 관리">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => toggleAnnouncementPin(announcement.id),
                announcement.isPinned ? "고정 해제되었습니다." : "상단에 고정되었습니다.",
              )
            }
          >
            {announcement.isPinned ? (
              <>
                <PinOff className="size-4" />
                고정 해제
              </>
            ) : (
              <>
                <Pin className="size-4" />
                상단 고정
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AnnouncementEditor
        open={editOpen}
        onOpenChange={setEditOpen}
        announcement={announcement}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{announcement.title}</b> 공지를 삭제합니다. 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(() => deleteAnnouncement(announcement.id), "공지가 삭제되었습니다.")
              }
            >
              {pending ? "처리 중..." : "삭제"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
