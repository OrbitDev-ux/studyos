import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { AdminHeader } from "@/features/admin/components/admin-header";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { getAdminNotifications } from "@/features/admin/queries";
import { requireAdmin } from "@/lib/admin/context";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gates /admin/*; this re-reads the account so a
  // deactivated/deleted admin is bounced even with a still-valid cookie.
  const admin = await requireAdmin();
  const notifications = await getAdminNotifications();

  return (
    <ToastProvider>
      <SidebarProvider>
        <AdminSidebar role={admin.role} />
        <SidebarInset>
          <AdminHeader
            admin={{ name: admin.name, email: admin.email, role: admin.role }}
            notifications={notifications}
          />
          <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </ToastProvider>
  );
}
