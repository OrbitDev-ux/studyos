"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  deletePrompt,
  rollbackPrompt,
  setPromptEnabled,
} from "@/features/admin/prompt-actions";

export function PromptEnabledToggle({
  promptId,
  enabled,
}: {
  promptId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function toggle(next: boolean) {
    setPending(true);
    try {
      const result = await setPromptEnabled(promptId, next);
      if (result?.error) {
        toast({ title: "실패", description: result.error, variant: "error" });
        return;
      }
      toast({
        title: next ? "활성화되었습니다." : "비활성화되었습니다.",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={enabled} disabled={pending} onCheckedChange={toggle} />
      {enabled ? "활성" : "비활성"}
    </label>
  );
}

export function DeletePromptButton({ promptId }: { promptId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm" className="text-destructive">
          <Trash2 className="size-4" />
          삭제
        </Button>
      }
      title="프롬프트 삭제"
      description="이 프롬프트와 모든 버전 기록이 삭제됩니다. AI는 코드 기본값으로 되돌아갑니다."
      confirmLabel="삭제"
      variant="destructive"
      successMessage="프롬프트가 삭제되었습니다."
      onConfirm={() => deletePrompt(promptId)}
    />
  );
}

export function RollbackButton({
  promptId,
  version,
}: {
  promptId: string;
  version: number;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          <RotateCcw className="size-4" />이 버전으로 롤백
        </Button>
      }
      title={`v${version}로 롤백`}
      description="이 버전을 활성 버전으로 되돌립니다. 이후 버전은 기록에 그대로 남습니다."
      confirmLabel="롤백"
      successMessage={`v${version}로 롤백되었습니다.`}
      onConfirm={() => rollbackPrompt(promptId, version)}
    />
  );
}
