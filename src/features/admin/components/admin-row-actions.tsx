"use client";

import { MoreHorizontal, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminRole } from "@/generated/prisma/client";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { deleteAdmin, updateAdminRole } from "@/features/admin/admin-actions";
import { ADMIN_ROLES, ROLE_LABELS } from "@/lib/admin/permissions";

type Kind = "role" | "delete" | null;

export function AdminRowActions({
  admin,
  isSelf,
}: {
  admin: { id: string; name: string | null; email: string; role: AdminRole };
  isSelf: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<Kind>(null);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState<AdminRole>(admin.role);

  const label = admin.name ?? admin.email;

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
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  // Can't act on yourself from here — prevents self-lockout; use another
  // super admin's session instead.
  if (isSelf) {
    return <span className="text-muted-foreground pr-2 text-xs">현재 계정</span>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`${label} 관리`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onSelect={() => {
              setRole(admin.role);
              setDialog("role");
            }}
          >
            <UserCog className="size-4" />
            역할 변경
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
            <Trash2 className="size-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role change */}
      <Dialog open={dialog === "role"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>역할 변경</DialogTitle>
            <DialogDescription>
              <b>{label}</b> 님의 역할을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>역할</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              취소
            </Button>
            <Button
              disabled={pending || role === admin.role}
              onClick={() =>
                run(
                  () => updateAdminRole({ adminId: admin.id, role }),
                  "역할이 변경되었습니다.",
                )
              }
            >
              {pending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>관리자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{label}</b> 관리자를 삭제합니다. 이 관리자는 더 이상 로그인할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deleteAdmin(admin.id), "관리자가 삭제되었습니다.")}
            >
              {pending ? "처리 중..." : "삭제"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
