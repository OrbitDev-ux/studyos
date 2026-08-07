"use client";

import { Ban, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  blockIp,
  clearAdminSessions,
  unblockIp,
} from "@/features/admin/security-actions";

export function BlockIpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await blockIp({ ip, reason });
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
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
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
      <Button
        type="submit"
        variant="destructive"
        className="h-9 shrink-0"
        disabled={pending || ip.trim().length < 3}
      >
        <Ban className="size-4" />
        차단
      </Button>
    </form>
  );
}

export function UnblockButton({ id, ip }: { id: string; ip: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          차단 해제
        </Button>
      }
      title="IP 차단 해제"
      description={
        <>
          <b className="font-mono">{ip}</b> 의 차단을 해제합니다.
        </>
      }
      confirmLabel="해제"
      successMessage="차단이 해제되었습니다."
      onConfirm={() => unblockIp(id)}
    />
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
