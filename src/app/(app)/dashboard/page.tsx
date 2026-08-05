import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        안녕하세요, {session?.user?.name ?? session?.user?.email}님
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        대시보드 위젯은 5단계에서 채워집니다.
      </p>
    </div>
  );
}
