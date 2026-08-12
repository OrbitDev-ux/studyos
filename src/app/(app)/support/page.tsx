import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewTicketDialog } from "@/features/support/components/new-ticket-dialog";
import {
  SUPPORT_STATUS_LABEL,
  SUPPORT_STATUS_VARIANT,
  SUPPORT_TYPE_LABEL,
} from "@/features/support/constants";
import { getUserTickets } from "@/features/support/queries";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "문의하기" };

export default async function SupportPage() {
  const user = await requireCurrentUser();
  const tickets = await getUserTickets(user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <LifeBuoy className="size-5" /> 내 문의
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            궁금한 점이나 문제가 있다면 문의를 남겨주세요. 관리자가 확인 후 답변드려요.
          </p>
        </div>
        <NewTicketDialog />
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
            <LifeBuoy className="size-8 opacity-40" />
            <p>아직 문의 내역이 없어요.</p>
            <p>도움이 필요하면 &lsquo;새 문의 작성&rsquo;으로 문의를 남겨주세요.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/support/${t.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {SUPPORT_TYPE_LABEL[t.type]} ·{" "}
                        {new Date(t.updatedAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <Badge variant={SUPPORT_STATUS_VARIANT[t.status]} className="shrink-0">
                      {SUPPORT_STATUS_LABEL[t.status]}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
