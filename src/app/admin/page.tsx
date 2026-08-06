import { Button } from "@/components/ui/button";
import { adminSignOut } from "@/features/admin/actions";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">관리자 페이지</h1>
        <form action={adminSignOut}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
      <p className="text-muted-foreground text-sm">관리자 세션으로 접근했습니다.</p>
    </div>
  );
}
