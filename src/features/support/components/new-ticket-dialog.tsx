"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createTicket } from "@/features/support/actions";
import { SUPPORT_TYPES } from "@/features/support/constants";
import type { SupportTicketType } from "@/generated/prisma/client";

/** "새 문의 작성" — Dialog + form. Loading/success/error/validation states. */
export function NewTicketDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SupportTicketType>("BUG");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const res = await createTicket({ type, title, content });
      if (res.error) {
        setError(res.error);
        return;
      }
      toast({
        title: "문의가 접수되었습니다.",
        description: "관리자가 확인 후 답변드리겠습니다.",
      });
      setOpen(false);
      setTitle("");
      setContent("");
      if (res.ticketId) router.push(`/support/${res.ticketId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> 새 문의 작성
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>문의하기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-type">문의 유형</Label>
            <Select value={type} onValueChange={(v) => setType(v as SupportTicketType)}>
              <SelectTrigger id="ticket-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.emoji} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-title">제목</Label>
            <Input
              id="ticket-title"
              value={title}
              maxLength={120}
              placeholder="제목을 입력하세요"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-content">문의 내용</Label>
            <Textarea
              id="ticket-content"
              value={content}
              rows={6}
              maxLength={5000}
              placeholder="문의 내용을 자세히 적어주세요"
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="button" onClick={submit} disabled={pending} className="self-end">
            {pending ? "문의 제출 중..." : "문의 제출"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
