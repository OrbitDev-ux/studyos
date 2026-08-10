import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { LEGAL_DOCUMENT_LIST } from "@/features/legal/documents";
import { requireAdmin } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Read-only legal-document registry for admins (MVP). Document CONTENT is
 * managed as static data in features/legal/documents — this surfaces each
 * document's current version, 시행일, and 최종 수정일 so operators can see what
 * is live and when it changed. Editing versions/dates is a deliberate future
 * step (avoid over-building a CMS). Gated by requireAdmin (the /admin layout
 * already enforces this too).
 */
export default async function AdminLegalPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="법적 문서"
        description="현재 게시 중인 법적 문서의 버전 · 시행일 · 최종 수정일입니다. 문서 본문은 코드(정적 데이터)로 관리됩니다."
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>문서</TableHead>
                <TableHead>버전</TableHead>
                <TableHead>시행일</TableHead>
                <TableHead>최종 수정일</TableHead>
                <TableHead className="text-right">보기</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEGAL_DOCUMENT_LIST.map((doc) => (
                <TableRow key={doc.slug}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell className="tabular-nums">{doc.version}</TableCell>
                  <TableCell className="tabular-nums">{doc.effectiveDate}</TableCell>
                  <TableCell className="tabular-nums">{doc.lastUpdated}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/legal/${doc.slug}`}
                      target="_blank"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
                    >
                      열기 <ExternalLink className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs leading-relaxed">
        회원가입 시 이용약관 · 개인정보 처리방침 동의는 LegalConsent에 문서 버전과 함께
        기록됩니다. 문서 버전을 올리면 재동의를 요구하도록 확장할 수 있습니다.
      </p>
    </div>
  );
}
