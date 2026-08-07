"use client";

import { Trash2, Wrench } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  clearAllAdminSessions,
  clearCache,
  setMaintenanceMode,
} from "@/features/admin/system-actions";

export function MaintenanceControl({
  enabled,
  title,
  message,
}: {
  enabled: boolean;
  title: string;
  message: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [titleText, setTitleText] = useState(title);
  const [msg, setMsg] = useState(message);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function apply(nextEnabled: boolean) {
    setPending(true);
    try {
      const result = await setMaintenanceMode({
        enabled: nextEnabled,
        title: titleText,
        message: msg,
      });
      if (result?.error) {
        toast({ title: "실패", description: result.error, variant: "error" });
        return;
      }
      toast({
        title: nextEnabled ? "점검모드가 켜졌습니다." : "점검모드가 해제되었습니다.",
        variant: "success",
      });
      setConfirmOpen(false);
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <Label className="flex items-center gap-1.5" htmlFor="maint-switch">
            <Wrench className="size-3.5" />
            점검모드
          </Label>
          <span className="text-muted-foreground text-xs">
            켜지면 관리자를 제외한 모든 사용자에게 점검 안내가 표시됩니다.
          </span>
        </div>
        <Switch
          id="maint-switch"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(next) => {
            if (next) setConfirmOpen(true);
            else apply(false);
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="maint-title">점검 제목</Label>
        <Input
          id="maint-title"
          value={titleText}
          onChange={(e) => setTitleText(e.target.value)}
          placeholder="서비스 점검 중"
          className="h-9"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="maint-message">점검 안내 내용</Label>
        <Textarea
          id="maint-message"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="현재 StudyOS는 점검 중입니다."
          className="min-h-16"
        />
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => apply(enabled)}
          >
            제목·내용 저장
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>점검모드 켜기</AlertDialogTitle>
            <AlertDialogDescription>
              일반 사용자의 서비스 접근이 차단됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <Button variant="destructive" disabled={pending} onClick={() => apply(true)}>
              {pending ? "적용 중..." : "점검모드 켜기"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function DangerousActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm">
            <Trash2 className="size-4" />
            캐시 초기화
          </Button>
        }
        title="캐시 초기화"
        description="전체 라우트/데이터 캐시를 무효화합니다. 다음 요청부터 새로 계산됩니다."
        confirmLabel="초기화"
        successMessage="캐시가 초기화되었습니다."
        onConfirm={() => clearCache()}
      />
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm">
            <Trash2 className="size-4" />
            세션 초기화
          </Button>
        }
        title="모든 관리자 세션 초기화"
        description="현재 계정을 포함한 모든 관리자가 즉시 로그아웃됩니다."
        confirmLabel="초기화"
        variant="destructive"
        successMessage="모든 세션이 초기화되었습니다."
        onConfirm={() => clearAllAdminSessions()}
      />
    </div>
  );
}
