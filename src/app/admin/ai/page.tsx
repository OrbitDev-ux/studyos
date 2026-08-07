import { Bot, FileText, ListChecks, MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AiSettingsForm } from "@/features/admin/components/ai-settings-form";
import { StatTile } from "@/features/admin/components/stat-tile";
import { AI_PROMPTS, getAiStatus } from "@/features/admin/ai-queries";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminAiPage() {
  await requireCapability("manageAi");
  const status = await getAiStatus();

  const serviceHealthy = status.enabled && status.apiKeyConfigured;

  return (
    <>
      <AdminPageHeader
        title="AI 관리"
        description="AI 기능 상태, 사용량, 모델 및 프롬프트"
      />

      {/* Status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="text-muted-foreground size-4" />
              <span className="text-sm font-medium">AI 서비스</span>
            </div>
            {serviceHealthy ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                정상
              </Badge>
            ) : status.enabled ? (
              <Badge variant="destructive">키 미설정</Badge>
            ) : (
              <Badge variant="secondary">비활성화</Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">API 키</span>
            <Badge variant={status.apiKeyConfigured ? "outline" : "destructive"}>
              {status.apiKeyConfigured ? "설정됨" : "없음"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">모델</span>
            <Badge variant="outline" className="font-mono">
              {status.model}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Usage */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="생성된 문제"
          value={status.usage.problems}
          icon={Sparkles}
          hint={`최근 7일 +${status.usage.problemsWeek}`}
        />
        <StatTile label="모의고사" value={status.usage.mockExams} icon={ListChecks} />
        <StatTile
          label="AI 분석"
          value={status.usage.analyses}
          icon={FileText}
          hint={`최근 7일 +${status.usage.analysesWeek}`}
        />
        <StatTile
          label="주간 생성"
          value={status.usage.problemsWeek + status.usage.analysesWeek}
          icon={MessageSquare}
        />
      </div>

      {/* Settings */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>설정</CardTitle>
        </CardHeader>
        <CardContent>
          <AiSettingsForm enabled={status.enabled} model={status.model} />
        </CardContent>
      </Card>

      {/* Prompts (read-only) */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>프롬프트</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs">
            각 AI 기능이 사용하는 시스템 프롬프트입니다. (읽기 전용)
          </p>
          {AI_PROMPTS.map((p) => (
            <details key={p.label} className="border-input rounded-lg border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                {p.label}
              </summary>
              <pre className="text-muted-foreground border-t px-3 py-2 text-xs whitespace-pre-wrap">
                {p.prompt}
              </pre>
            </details>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
