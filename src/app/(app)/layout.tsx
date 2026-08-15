import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { PresenceHeartbeat } from "@/features/profile/components/presence-heartbeat";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { I18nProvider } from "@/features/i18n/provider";
import { getServerLocale } from "@/features/i18n/server";
import { getHeaderNotifications } from "@/features/notifications/queries";
import { getSocialNotificationCount } from "@/features/social/queries";
import { getCurrentAdmin } from "@/lib/admin/context";
import { getMaintenance } from "@/lib/maintenance";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Backup maintenance gate (the Edge middleware is primary). Blocks regular
  // users, lets admins through — presence of a valid admin session is the
  // bypass. Kept as Node-side defense in case the middleware fails open.
  if ((await getMaintenance()).enabled) {
    const admin = await getCurrentAdmin();
    if (!admin) redirect("/maintenance");
  }

  // Friend requests + unread DMs → the "친구" sidebar badge.
  // Notification feed (review due + social) → the header bell.
  const [socialCount, notifications] = await Promise.all([
    getSocialNotificationCount(session.user.id),
    getHeaderNotifications(session.user.id),
  ]);

  // Show the upgrade CTA to everyone except PREMIUM. Cheap PK lookup.
  const planRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, locale: true },
  });
  const showUpgrade = planRow?.plan !== "PREMIUM";
  // Central locale resolution (user choice → cookie → browser → IP → default).
  const locale = await getServerLocale(planRow?.locale);

  return (
    // App-wide toast context. Without it, any client component that calls
    // useToast() (e.g. the 문제은행 card) throws "useToast must be used within a
    // ToastProvider" during render — which the route error boundary would catch.
    <I18nProvider locale={locale}>
      <ToastProvider>
        <OfflineBanner />
        <SidebarProvider>
          <PresenceHeartbeat />
          <AppSidebar user={session.user} socialCount={socialCount} showUpgrade={showUpgrade} />
          <SidebarInset>
            <Header notifications={notifications} />
            <main className="flex flex-1 flex-col gap-4 p-4 pb-24 md:p-6 md:pb-6">
              {children}
            </main>
            <BottomNav socialCount={socialCount} />
          </SidebarInset>
        </SidebarProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
