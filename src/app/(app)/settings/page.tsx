import Link from "next/link";
import { ChevronRight, FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSelect } from "@/features/i18n/components/language-select";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { NotificationPreferencesForm } from "@/features/notifications/components/notification-preferences-form";
import { getNotificationPreferences } from "@/features/notifications/service";
import { AccountDeletionCard } from "@/features/account/components/account-deletion-card";
import { getCurrentConsents } from "@/features/legal/consent";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const [row, notificationPreferences, consents] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } }),
    getNotificationPreferences(user.id),
    getCurrentConsents(user.id),
  ]);
  const mode: "auto" | "manual" = row?.locale ? "manual" : "auto";
  const locale = await getServerLocale(row?.locale);
  const t = getMessages(locale);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 md:gap-8">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {t.nav.settings}
      </h1>
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
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold">{t.consentStatus.title}</h2>
            <p className="text-muted-foreground text-sm">{t.consentStatus.subtitle}</p>
          </div>
          <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
            {consents.map((consent) => (
              <li key={`${consent.documentType}-${consent.version}`} className="flex justify-between gap-3">
                <span>{consent.documentType}</span>
                <span>{consent.version} · {consent.withdrawnAt ? t.consentStatus.withdrawn : t.consentStatus.agreed}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <NotificationPreferencesForm initial={notificationPreferences} />
        </CardContent>
      </Card>
      <AccountDeletionCard />
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
