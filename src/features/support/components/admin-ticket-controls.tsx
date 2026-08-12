"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  replyToTicket,
  updateAdminNote,
  updateTicketStatus,
} from "@/features/support/admin-actions";
import { SUPPORT_STATUS_IDS, SUPPORT_STATUS_LABEL } from "@/features/support/constants";
import type { SupportTicketStatus } from "@/generated/prisma/client";

export function AdminTicketControls({
  ticketId,
  status,
  adminNote,
}: {
  ticketId: string;
  status: SupportTicketStatus;
  adminNote: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState(adminNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendReply() {
    setError(null);
    if (!reply.trim()) {
      setError("답변 내용을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const res = await replyToTicket({ ticketId, content: reply });
      if (res.error) return setError(res.error);
      setReply("");
      toast({ title: "답변이 등록되었습니다." });
      router.refresh();
    });
  }

  function changeStatus(next: SupportTicketStatus) {
    startTransition(async () => {
      const res = await updateTicketStatus({ ticketId, status: next });
      if (res.error) return toast({ title: res.error });
      toast({ title: "상태를 변경했습니다." });
      router.refresh();
    });
  }

  function saveNote() {
    startTransition(async () => {
      const res = await updateAdminNote({ ticketId, note });
      if (res.error) return toast({ title: res.error });
      toast({ title: "관리자 메모를 저장했습니다." });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 답변 */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">답변</p>
        <Textarea
          rows={4}
          value={reply}
          maxLength={5000}
          placeholder="답변을 입력하세요"
          onChange={(e) => setReply(e.target.value)}
        />
        {error && <p className="text-destructive text-xs">{error}</p>}
        <Button type="button" onClick={sendReply} disabled={pending} className="self-end">
          {pending ? "전송 중..." : "답변 전송"}
        </Button>
      </div>

      {/* 상태 변경 */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">상태 변경</p>
        <Select value={status} onValueChange={(v) => changeStatus(v as SupportTicketStatus)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORT_STATUS_IDS.map((s) => (
              <SelectItem key={s} value={s}>
                {SUPPORT_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 관리자 메모 (사용자 비노출) */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          관리자 메모 <span className="text-muted-foreground text-xs">(사용자에게 노출되지 않음)</span>
        </p>
        <Textarea
          rows={3}
          value={note}
          maxLength={5000}
          placeholder="내부 메모"
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={saveNote}
          disabled={pending}
          className="self-end"
        >
          메모 저장
        </Button>
      </div>
    </div>
  );
}
