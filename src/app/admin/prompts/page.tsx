import { Bot, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { formatDateTime } from "@/features/admin/format";
import { getPrompts } from "@/features/admin/prompt-queries";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCapability("managePrompts");
  const { q } = await searchParams;
  const prompts = await getPrompts(q);

  return (
    <>
      <AdminPageHeader
        title="AI 프롬프트"
        description="AI가 사용하는 프롬프트를 DB에서 관리합니다 (버전·롤백·테스트)."
      />

      <form method="get" className="flex gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="제목·타입 검색"
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" variant="secondary" className="h-9">
          검색
        </Button>
      </form>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>프롬프트</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="hidden sm:table-cell">활성 버전</TableHead>
                <TableHead className="hidden md:table-cell">수정일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-10 text-center"
                  >
                    프롬프트가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                prompts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/admin/prompts/${p.id}`}
                        className="flex items-start gap-2.5 hover:underline"
                      >
                        <Bot className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">{p.title}</span>
                          <span className="text-muted-foreground truncate font-mono text-xs">
                            {p.type}
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {p.enabled ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          활성
                        </Badge>
                      ) : (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs sm:table-cell">
                      v{p.activeVersion} · 총 {p.versionCount}개
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                      {formatDateTime(p.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
