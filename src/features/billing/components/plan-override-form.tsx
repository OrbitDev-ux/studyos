"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { PLANS, PLAN_META, type Plan } from "@/features/billing/plans";
import {
  disablePlanOverride,
  savePlanOverride,
  type OverrideView,
} from "@/features/billing/admin-override";

const ACCESS_LABEL: Record<string, string> = {
  TRIAL: "체험",
  TRIAL_EXPIRED: "체험 만료",
  PRO: "PRO",
  PREMIUM: "PREMIUM",
};

export function PlanOverrideForm({ view }: { view: OverrideView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(
    view.hasUser ? view.overrideEnabled : false,
  );
  const [plan, setPlan] = useState<Plan>(
    view.hasUser ? (view.overridePlan ?? view.realPlan) : "PREMIUM",
  );
  const [pending, setPending] = useState(false);

  if (!view.hasUser) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">
          StudyOS 앱에 로그인되어 있지 않습니다. 오버라이드는 <b>현재 앱에 로그인한
          계정</b>에 적용되므로, 테스트할 계정으로{" "}
          <a href="/login" className="underline" target="_blank" rel="noreferrer">
            앱에 로그인
          </a>
          한 뒤 이 페이지를 새로고침하세요.
        </p>
      </div>
    );
  }

  async function save() {
    setPending(true);
    try {
      const res = await savePlanOverride({ enabled, plan });
      if ("error" in res) {
        toast({ title: "실패", description: res.error, variant: "error" });
        return;
      }
      toast({ title: "플랜 오버라이드가 저장되었습니다.", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    try {
      const res = await disablePlanOverride();
      if ("error" in res) {
        toast({ title: "실패", description: res.error, variant: "error" });
        return;
      }
      setEnabled(false);
      toast({ title: "플랜 오버라이드를 해제했습니다.", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "오류가 발생했습니다.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground text-xs">
        적용 대상(현재 앱 로그인 계정):{" "}
        <span className="font-mono">{view.userEmail}</span>
      </p>
      {/* Real vs override vs effective — clearly separated */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StateBox label="실제 구독 (변경 안 됨)">
          <Badge variant="outline">{PLAN_META[view.realPlan].name}</Badge>
          <span className="text-muted-foreground text-xs">
            {ACCESS_LABEL[view.realAccessState] ?? view.realAccessState}
          </span>
        </StateBox>
        <StateBox label="관리자 Override">
          {view.overrideEnabled && view.overridePlan ? (
            <Badge>{PLAN_META[view.overridePlan].name}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">OFF</span>
          )}
        </StateBox>
        <StateBox label="현재 적용 플랜 (effective)">
          <Badge variant={view.overrideEnabled ? "default" : "outline"}>
            {PLAN_META[view.effectivePlan].name}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {ACCESS_LABEL[view.effectiveAccessState] ?? view.effectiveAccessState}
          </span>
        </StateBox>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <div className="flex flex-col">
          <Label htmlFor="override-enabled">Override 활성화</Label>
          <span className="text-muted-foreground text-xs">
            끄면 실제 billing/entitlement 상태를 그대로 사용합니다.
          </span>
        </div>
        <Switch
          id="override-enabled"
          checked={enabled}
          disabled={pending}
          onCheckedChange={setEnabled}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Override 플랜</Label>
        <Select
          value={plan}
          onValueChange={(v) => setPlan(v as Plan)}
          disabled={pending || !enabled}
        >
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLANS.map((p) => (
              <SelectItem key={p} value={p}>
                {PLAN_META[p].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs">
          실제 결제는 바뀌지 않습니다. 본인(관리자) 계정에만 테스트용으로 적용됩니다.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
        <Button
          variant="outline"
          onClick={disable}
          disabled={pending || !view.overrideEnabled}
        >
          Override 해제
        </Button>
      </div>
    </div>
  );
}

function StateBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
