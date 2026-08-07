import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  DeletePromptButton,
  PromptEnabledToggle,
  RollbackButton,
} from "@/features/admin/components/prompt-controls";
import { PromptWorkspace } from "@/features/admin/components/prompt-workspace";
import { formatDateTime } from "@/features/admin/format";
import { getPromptDetail } from "@/features/admin/prompt-queries";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };
// The prompt test issues a live AI call; give the action room past the default.
export const maxDuration = 60;

export default async function AdminPromptDetailPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  await requireCapability("managePrompts");
  const { promptId } = await params;
  const prompt = await getPromptDetail(promptId);
  if (!prompt) notFound();

  return (
    <>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/prompts">
            <ArrowLeft className="size-4" />
            목록
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title={prompt.title}
        description={prompt.description ?? prompt.type}
        action={
          <div className="flex items-center gap-3">
            <PromptEnabledToggle promptId={prompt.id} enabled={prompt.enabled} />
            <DeletePromptButton promptId={prompt.id} />
          </div>
        }
      />

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="font-mono">
          {prompt.type}
        </Badge>
        <span>활성 버전 v{prompt.activeVersion}</span>
        {!prompt.enabled && <Badge variant="secondary">비활성 — 코드 기본값 사용</Badge>}
      </div>

      <Card>
        <CardContent>
          <PromptWorkspace promptId={prompt.id} initialContent={prompt.activeContent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <History className="text-muted-foreground size-4" />
            버전 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y">
            {prompt.versions.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{v.version}</span>
                    {v.isActive && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        활성
                      </Badge>
                    )}
                    {v.note && (
                      <span className="text-muted-foreground truncate text-xs">
                        {v.note}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {v.createdByName ?? "—"} · {formatDateTime(v.createdAt)}
                    {v.ip ? ` · ${v.ip}` : ""}
                  </span>
                </div>
                {!v.isActive && (
                  <RollbackButton promptId={prompt.id} version={v.version} />
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
