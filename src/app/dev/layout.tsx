import { redirect } from "next/navigation";
import { DevHeader } from "@/components/dev/dev-header";
import { DevSidebar } from "@/components/dev/dev-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/features/i18n/provider";
import { getServerLocale } from "@/features/i18n/server";
import { getMaintenance } from "@/lib/maintenance";
import { getCurrentAdmin } from "@/lib/admin/context";
import { requireCurrentUser } from "@/lib/session";

/**
 * Study OS Dev's own layout — separate from the main (app) layout (§5), reusing
 * the same auth (requireCurrentUser — banned/session-invalidation handled
 * identically, nothing reimplemented), i18n, theme, and Sidebar UI primitives.
 * No BottomNav here: the shared Sidebar component's own mobile off-canvas
 * behavior is the responsive story (§37), not a separate mobile nav.
 */
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  // Reuses the exact same auth/ban/maintenance gates as the main app layout.
  const user = await requireCurrentUser();

  if ((await getMaintenance()).enabled) {
    const admin = await getCurrentAdmin();
    if (!admin) redirect("/maintenance");
  }

  const locale = await getServerLocale(user.locale);

  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <SidebarProvider>
          <DevSidebar />
          <SidebarInset>
            <DevHeader />
            <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
