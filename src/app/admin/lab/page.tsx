import { Badge } from "@/components/ui/badge";
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
import { LabToggle } from "@/features/lab/components/lab-toggle";
import { LAB_FEATURES, LAB_STATUS_LABEL, LAB_STATUS_VARIANT } from "@/features/lab/registry";
import { getFeedbackCounts, getLabFeatureStates } from "@/features/lab/state";
import { requireCapability } from "@/lib/admin/context";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLabPage() {
  await requireCapability("manageLab");
  const [states, feedback] = await Promise.all([getLabFeatureStates(), getFeedbackCounts()]);

  return (
    <>
      <AdminPageHeader
        title="🧪 실험실 관리"
        description="실험 기능을 켜고 끄고, 사용/피드백 지표를 확인합니다."
      />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기능</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-center">활성화</TableHead>
                <TableHead className="hidden text-right sm:table-cell">노출</TableHead>
                <TableHead className="text-right">사용</TableHead>
                <TableHead className="hidden text-right md:table-cell">성공/실패</TableHead>
                <TableHead className="text-right">👍 / 👎</TableHead>
                <TableHead className="hidden text-right md:table-cell">최근</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LAB_FEATURES.map((f) => {
                const s = states.get(f.key)!;
                const fb = feedback.get(f.key)!;
                return (
                  <TableRow key={f.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span aria-hidden>{f.emoji}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{f.name}</span>
                          <span className="text-muted-foreground text-xs">{f.key}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={LAB_STATUS_VARIANT[f.status]}>
                        {LAB_STATUS_LABEL[f.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <LabToggle featureKey={f.key} enabled={s.enabled} />
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {s.impressions}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.uses}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {s.successes} / {s.failures}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fb.likes} / {fb.dislikes}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-right text-xs md:table-cell">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("ko-KR") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
