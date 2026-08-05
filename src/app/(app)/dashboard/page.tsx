import { auth } from "@/lib/auth";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-lg">
        {session?.user?.name ?? session?.user?.email}님, 환영합니다.
      </p>
      <SignOutButton />
    </div>
  );
}
