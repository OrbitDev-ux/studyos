import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TicketReadMarker } from "@/features/support/components/ticket-read-marker";
import { TicketReplyForm } from "@/features/support/components/ticket-reply-form";
import {
  SUPPORT_STATUS_VARIANT,
  supportStatusLabel,
  supportTypeLabel,
} from "@/features/support/constants";
import { getUserTicket } from "@/features/support/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const user = await requireCurrentUser();
  // Ownership is the WHERE clause — another user's ticketId returns null → 404.
  const ticket = await getUserTicket(ticketId, user.id);
  if (!ticket) notFound();

  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).support;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <TicketReadMarker ticketId={ticket.id} />

      <Link
        href="/support"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> {t.back}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{ticket.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {supportTypeLabel(t, ticket.type)} ·{" "}
            {new Date(ticket.createdAt).toLocaleString(locale)}
          </p>
        </div>
        <Badge variant={SUPPORT_STATUS_VARIANT[ticket.status]}>
          {supportStatusLabel(t, ticket.status)}
        </Badge>
      </div>

      <div className="flex flex-col gap-3">
        {ticket.messages.map((m) => {
          const isUser = m.authorRole === "user";
          return (
            <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <Card className={cn("max-w-[85%]", isUser ? "bg-primary/5 border-primary/20" : "")}>
                <CardContent className="flex flex-col gap-1 py-3">
                  <span className="text-muted-foreground text-xs font-medium">
                    {isUser ? t.authorUser : t.authorAdmin}
                  </span>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <span className="text-muted-foreground mt-0.5 text-[11px]">
                    {new Date(m.createdAt).toLocaleString(locale)}
                  </span>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="py-4">
          <TicketReplyForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} />
        </CardContent>
      </Card>
    </div>
  );
}
