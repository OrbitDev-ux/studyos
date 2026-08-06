import { AdminCodeForm } from "@/features/admin/components/admin-code-form";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminAuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-lg font-semibold tracking-tight">Admin Code</h1>
      <div className="w-full max-w-xs">
        <AdminCodeForm />
      </div>
    </div>
  );
}
