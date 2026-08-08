import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PresenceHeartbeat } from "@/features/profile/components/presence-heartbeat";
import { getSocialNotificationCount } from "@/features/social/queries";
import { getCurrentAdmin } from "@/lib/admin/context";
import { getMaintenance } from "@/lib/maintenance";
import { auth } from "@/lib/auth";

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
  const socialCount = await getSocialNotificationCount(session.user.id);

  return (
    <SidebarProvider>
      <PresenceHeartbeat />
      <AppSidebar user={session.user} socialCount={socialCount} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
