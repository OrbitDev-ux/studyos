import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function NotFound() {
  const session = await auth();
  const homeHref = session?.user ? "/dashboard" : "/login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-muted-foreground text-sm">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground text-sm">주소를 다시 확인해주세요.</p>
      <Button asChild className="mt-2">
        <Link href={homeHref}>홈으로 돌아가기</Link>
      </Button>
    </div>
  );
}
