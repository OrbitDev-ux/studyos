import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewTicketDialog } from "@/features/support/components/new-ticket-dialog";
import {
  SUPPORT_STATUS_VARIANT,
  supportStatusLabel,
  supportTypeLabel,
} from "@/features/support/constants";
import { getUserTickets } from "@/features/support/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "문의하기" };

export default async function SupportPage() {
  const user = await requireCurrentUser();
  const tickets = await getUserTickets(user.id);
  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).support;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <LifeBuoy className="size-5" /> {t.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.subtitle}</p>
        </div>
        <NewTicketDialog />
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
            <LifeBuoy className="size-8 opacity-40" />
            <p>{t.emptyTitle}</p>
            <p>{t.emptyDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link href={`/support/${ticket.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{ticket.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {supportTypeLabel(t, ticket.type)} ·{" "}
                        {new Date(ticket.updatedAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <Badge variant={SUPPORT_STATUS_VARIANT[ticket.status]} className="shrink-0">
                      {supportStatusLabel(t, ticket.status)}
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
