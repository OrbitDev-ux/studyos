import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentAdmin } from "@/lib/admin/context";
import { isMaintenanceMode } from "@/lib/admin/settings";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Maintenance gate: block the app for regular users, but let admins through
  // (they need the app to verify a fix) — presence of a valid admin session
  // is the bypass.
  if (await isMaintenanceMode()) {
    const admin = await getCurrentAdmin();
    if (!admin) redirect("/maintenance");
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
