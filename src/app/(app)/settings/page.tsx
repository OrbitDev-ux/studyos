import Link from "next/link";
import { ChevronRight, FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSelect } from "@/features/i18n/components/language-select";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { NotificationPreferencesForm } from "@/features/notifications/components/notification-preferences-form";
import { getNotificationPreferences } from "@/features/notifications/service";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const [row, notificationPreferences] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } }),
    getNotificationPreferences(user.id),
  ]);
  const mode: "auto" | "manual" = row?.locale ? "manual" : "auto";
  const locale = await getServerLocale(row?.locale);
  const t = getMessages(locale);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">{t.nav.settings}</h1>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold">{t.language.title}</h2>
            <p className="text-muted-foreground text-sm">{t.language.subtitle}</p>
          </div>
          <LanguageSelect initialMode={mode} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <NotificationPreferencesForm initial={notificationPreferences} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Link href="/lab" className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <FlaskConical className="text-muted-foreground size-4" />
              <span>
                <span className="block font-semibold">{t.lab.title}</span>
                <span className="text-muted-foreground block text-xs">
                  {t.lab.subtitle}
                </span>
              </span>
            </span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
