"use client";

import { Ban, LogOut, MoreHorizontal, Pencil, Trash2, Undo2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  blockIp,
  clearAdminSessions,
  deleteBan,
  unblockIp,
  updateBanReason,
} from "@/features/admin/security-actions";

const DURATIONS = [
  { label: "1시간", hours: 1 },
  { label: "24시간", hours: 24 },
  { label: "7일", hours: 24 * 7 },
  { label: "30일", hours: 24 * 30 },
];

export function BlockIpForm({ currentIp }: { currentIp: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [permanent, setPermanent] = useState(true);
  const [durationHours, setDurationHours] = useState(24);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await blockIp({
        ip,
        reason,
        permanent,
        durationHours: permanent ? undefined : durationHours,
      });
      if (result?.error) {
        toast({ title: "실패", description: result.error, variant: "error" });
        return;
      }
      toast({ title: "IP를 차단했습니다.", variant: "success" });
      setIp("");
      setReason("");
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="차단할 IP (예: 203.0.113.4)"
          className="h-9 font-mono"
          aria-label="차단할 IP"
        />
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="사유 (선택)"
          className="h-9"
          aria-label="차단 사유"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={permanent} onCheckedChange={setPermanent} />
          영구 차단
        </label>
        {!permanent && (
          <Select
            value={String(durationHours)}
            onValueChange={(v) => setDurationHours(Number(v))}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d.hours} value={String(d.hours)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {currentIp !== "unknown" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => setIp(currentIp)}
          >
            내 IP 채우기 ({currentIp})
          </Button>
        )}
        <Button
          type="submit"
          variant="destructive"
          className="ml-auto h-9 shrink-0"
          disabled={pending || ip.trim().length < 3}
        >
          <Ban className="size-4" />
          차단
        </Button>
      </div>
    </form>
  );
}

export function BanRowActions({
  ban,
}: {
  ban: { id: string; ip: string; reason: string | null; effective: boolean };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState(ban.reason ?? "");
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
      setEditOpen(false);
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
          <Button variant="ghost" size="icon" aria-label={`${ban.ip} 관리`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {ban.effective && (
            <DropdownMenuItem
              onSelect={() => run(() => unblockIp(ban.id), "차단이 해제되었습니다.")}
            >
              <Undo2 className="size-4" />
              차단 해제
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            사유 수정
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>차단 사유 수정</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{ban.ip}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ban-reason">사유</Label>
            <Input
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="사유"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() => updateBanReason({ id: ban.id, reason }), "저장되었습니다.")
              }
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>차단 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{ban.ip}</span> 의 차단 기록을 완전히
              삭제합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deleteBan(ban.id), "삭제되었습니다.")}
            >
              삭제
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ClearSessionsButton() {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          <LogOut className="size-4" />
          모든 세션 로그아웃
        </Button>
      }
      title="모든 관리자 세션 무효화"
      description="현재 계정을 포함한 모든 관리자가 즉시 로그아웃되며 다시 로그인해야 합니다."
      confirmLabel="무효화"
      variant="destructive"
      successMessage="모든 세션이 무효화되었습니다."
      onConfirm={() => clearAdminSessions()}
    />
  );
}
