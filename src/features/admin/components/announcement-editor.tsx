"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  createAnnouncement,
  updateAnnouncement,
} from "@/features/admin/announcement-actions";
import { Markdown } from "@/features/admin/components/markdown";
import type { AnnouncementRow } from "@/features/admin/announcements-queries";

type Timing = "now" | "schedule" | "draft";

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AnnouncementEditor({
  open,
  onOpenChange,
  announcement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: AnnouncementRow;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(announcement);

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [isPinned, setIsPinned] = useState(announcement?.isPinned ?? false);
  const [timing, setTiming] = useState<Timing>(
    announcement?.status === "scheduled"
      ? "schedule"
      : announcement?.status === "draft"
        ? "draft"
        : "now",
  );
  const [scheduledAt, setScheduledAt] = useState(
    announcement?.scheduledAt ? toLocalInput(new Date(announcement.scheduledAt)) : "",
  );
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      const values = {
        title,
        body,
        isPinned,
        publishNow: timing === "now",
        scheduledAt: timing === "schedule" ? scheduledAt : "",
      };
      const result =
        isEdit && announcement
          ? await updateAnnouncement(announcement.id, values)
          : await createAnnouncement(values);
      if (result?.error) {
        toast({ title: "실패", description: result.error, variant: "error" });
        return;
      }
      toast({
        title: isEdit ? "공지가 수정되었습니다." : "공지가 등록되었습니다.",
        variant: "success",
      });
      onOpenChange(false);
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  const valid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (timing !== "schedule" || scheduledAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "공지 수정" : "새 공지 작성"}</DialogTitle>
          <DialogDescription>
            마크다운(제목 #, **굵게**, *기울임*, 목록, 링크)을 사용할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ann-title">제목</Label>
          <Input
            id="ann-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목"
          />
        </div>

        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">작성</TabsTrigger>
            <TabsTrigger value="preview">미리보기</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="pt-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="내용을 입력하세요 (마크다운 지원)"
              className="min-h-48 font-mono text-xs"
            />
          </TabsContent>
          <TabsContent value="preview" className="pt-2">
            <div className="border-input min-h-48 rounded-lg border p-3">
              {body.trim() ? (
                <Markdown content={body} />
              ) : (
                <p className="text-muted-foreground text-sm">미리볼 내용이 없습니다.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <Label htmlFor="ann-pin">상단 고정</Label>
            <span className="text-muted-foreground text-xs">
              목록 최상단에 표시됩니다.
            </span>
          </div>
          <Switch id="ann-pin" checked={isPinned} onCheckedChange={setIsPinned} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>게시 설정</Label>
            <Select value={timing} onValueChange={(v) => setTiming(v as Timing)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">지금 게시</SelectItem>
                <SelectItem value="schedule">예약 게시</SelectItem>
                <SelectItem value="draft">임시저장</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {timing === "schedule" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann-schedule">게시 시각</Label>
              <Input
                id="ann-schedule"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            취소
          </Button>
          <Button onClick={submit} disabled={pending || !valid}>
            {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
