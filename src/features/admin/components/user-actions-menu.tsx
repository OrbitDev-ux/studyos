"use client";

import { MoreHorizontal, ShieldMinus, ShieldPlus, UserCheck, UserX } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  banUser,
  demoteUser,
  promoteUser,
  unbanUser,
} from "@/features/admin/user-actions";
import { ROLE_LABELS } from "@/lib/admin/permissions";

type DialogKind = "ban" | "unban" | "promote" | "demote" | null;

export function UserActionsMenu({
  user,
  canBan,
  canPromote,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    isBanned: boolean;
    isAdmin: boolean;
  };
  canBan: boolean;
  canPromote: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MODERATOR">("MODERATOR");
  const [password, setPassword] = useState("");

  const label = user.name ?? user.email;

  async function run(fn: () => Promise<{ error?: string }>, success: string) {
    setPending(true);
    try {
      const result = await fn();
      if (result?.error) {
        toast({ title: "실패", description: result.error, variant: "error" });
        return;
      }
      toast({ title: success, variant: "success" });
      setDialog(null);
      setReason("");
      setPassword("");
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  if (!canBan && !canPromote) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`${label} 관리`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canBan &&
            (user.isBanned ? (
              <DropdownMenuItem onSelect={() => setDialog("unban")}>
                <UserCheck className="size-4" />
                정지 해제
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("ban")}>
                <UserX className="size-4" />
                계정 정지
              </DropdownMenuItem>
            ))}
          {canPromote &&
            (user.isAdmin ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDialog("demote")}
              >
                <ShieldMinus className="size-4" />
                관리자 해제
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => setDialog("promote")}>
                <ShieldPlus className="size-4" />
                관리자 지정
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ban with optional reason */}
      <Dialog open={dialog === "ban"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계정 정지</DialogTitle>
            <DialogDescription>
              <b>{label}</b> 계정을 정지합니다. 학습 데이터는 삭제되지 않으며 언제든
              해제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ban-reason">사유 (선택)</Label>
            <Textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="정지 사유를 입력하세요"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(() => banUser({ userId: user.id, reason }), "정지되었습니다.")
              }
            >
              {pending ? "처리 중..." : "정지"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote to admin */}
      <Dialog open={dialog === "promote"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 지정</DialogTitle>
            <DialogDescription>
              <b>{label}</b> 님에게 관리자 권한을 부여합니다. 초기 로그인 비밀번호를
              설정하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>역할</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "ADMIN" | "MODERATOR")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MODERATOR">{ROLE_LABELS.MODERATOR}</SelectItem>
                  <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promote-password">초기 비밀번호</Label>
              <Input
                id="promote-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              취소
            </Button>
            <Button
              disabled={pending || password.length < 8}
              onClick={() =>
                run(
                  () => promoteUser({ userId: user.id, role, password }),
                  "관리자로 지정되었습니다.",
                )
              }
            >
              {pending ? "처리 중..." : "지정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban confirm */}
      <AlertDialog open={dialog === "unban"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정지 해제</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{label}</b> 계정의 정지를 해제합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <Button
              disabled={pending}
              onClick={() => run(() => unbanUser(user.id), "정지가 해제되었습니다.")}
            >
              {pending ? "처리 중..." : "해제"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote confirm */}
      <AlertDialog open={dialog === "demote"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>관리자 해제</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{label}</b> 님의 관리자 권한을 해제합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(() => demoteUser(user.id), "관리자 권한이 해제되었습니다.")
              }
            >
              {pending ? "처리 중..." : "해제"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
