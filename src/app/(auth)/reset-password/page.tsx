import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = { title: `비밀번호 재설정 - ${siteConfig.name}` };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="from-primary/8 flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b via-transparent to-transparent px-4 py-10">
      <Link href="/" className="flex flex-col items-center gap-3 text-center">
        <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl shadow-lg shadow-primary/25">
          <GraduationCap className="size-6" />
        </span>
        <span className="text-xl font-semibold tracking-tight">{siteConfig.name}</span>
      </Link>

      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-lg font-semibold tracking-tight">비밀번호 재설정</h1>
            <p className="text-muted-foreground text-sm">새로 사용할 비밀번호를 입력해주세요.</p>
          </div>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-muted/50 rounded-lg border p-4 text-sm">
                <p className="font-medium">유효하지 않은 링크예요</p>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  링크가 올바르지 않거나 만료되었습니다. 다시 요청해주세요.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="text-primary text-center text-sm font-medium hover:underline"
              >
                재설정 링크 다시 받기
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-primary font-medium hover:underline">
          ← 로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
