import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";
import { getCurrentAdmin } from "@/lib/admin/context";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminAuthPage() {
  // Already signed in — skip the form.
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="bg-foreground text-background flex size-11 items-center justify-center rounded-xl">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">관리자 인증</h1>
        <p className="text-muted-foreground text-sm">StudyOS 운영자 전용 페이지입니다.</p>
      </div>
      <div className="bg-card ring-foreground/10 w-full max-w-sm rounded-xl p-6 ring-1">
        <AdminLoginForm />
      </div>
    </div>
  );
}
