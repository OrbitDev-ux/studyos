import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminTicketControls } from "@/features/support/components/admin-ticket-controls";
import {
  SUPPORT_STATUS_LABEL,
  SUPPORT_STATUS_VARIANT,
  SUPPORT_TYPE_LABEL,
} from "@/features/support/constants";
import { getAdminTicket } from "@/features/support/admin-queries";
import { requireCapability } from "@/lib/admin/context";
import { cn } from "@/lib/utils";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  await requireCapability("manageSupport");
  const { ticketId } = await params;
  const ticket = await getAdminTicket(ticketId);
  if (!ticket) notFound();

  return (
    <>
      <Link
        href="/admin/support"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> 문의 목록으로
      </Link>

      <AdminPageHeader
        title={ticket.title}
        description={`${SUPPORT_TYPE_LABEL[ticket.type]} · ${ticket.user.name ?? ticket.user.email}`}
      />

      <div className="flex items-center gap-2">
        <Badge variant={SUPPORT_STATUS_VARIANT[ticket.status]}>
          {SUPPORT_STATUS_LABEL[ticket.status]}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {ticket.user.email} · {new Date(ticket.createdAt).toLocaleString("ko-KR")}
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {ticket.messages.map((m) => {
            const isAdmin = m.authorRole === "admin";
            return (
              <div key={m.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg border p-3",
                    isAdmin ? "bg-primary/5 border-primary/20" : "bg-muted/40",
                  )}
                >
                  <span className="text-muted-foreground text-xs font-medium">
                    {isAdmin ? "🛟 관리자" : "문의자"}
                  </span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{m.content}</p>
                  <span className="text-muted-foreground mt-1 block text-[11px]">
                    {new Date(m.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <AdminTicketControls
            ticketId={ticket.id}
            status={ticket.status}
            adminNote={ticket.adminNote ?? ""}
          />
        </CardContent>
      </Card>
    </>
  );
}
