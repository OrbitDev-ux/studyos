"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateAiSettings } from "@/features/admin/ai-actions";

export function AiSettingsForm({
  enabled: initialEnabled,
  model: initialModel,
}: {
  enabled: boolean;
  model: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [model, setModel] = useState(initialModel);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const result = await updateAiSettings({ enabled, model });
      if (result?.error) {
        toast({ title: "실패", description: result.error, variant: "error" });
        return;
      }
      toast({ title: "AI 설정이 저장되었습니다.", variant: "success" });
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
          <Label htmlFor="ai-enabled">AI 기능</Label>
          <span className="text-muted-foreground text-xs">
            끄면 문제 생성·해설·분석 등 모든 AI 호출이 차단됩니다.
          </span>
        </div>
        <Switch
          id="ai-enabled"
          checked={enabled}
          disabled={pending}
          onCheckedChange={setEnabled}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ai-model">모델</Label>
        <Input
          id="ai-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gemini-3.6-flash"
          className="font-mono"
        />
        <span className="text-muted-foreground text-xs">
          Gemini 모델 ID. 모든 AI 기능이 이 모델을 사용합니다.
        </span>
      </div>

      <div>
        <Button onClick={save} disabled={pending || model.trim().length === 0}>
          {pending ? "저장 중..." : "설정 저장"}
        </Button>
      </div>
    </div>
  );
}
