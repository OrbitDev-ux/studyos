import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = { title: `계정 찾기 - ${siteConfig.name}` };

export default function ForgotPasswordPage() {
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
            <h1 className="text-lg font-semibold tracking-tight">계정 찾기 · 비밀번호 재설정</h1>
            <p className="text-muted-foreground text-sm">
              가입할 때 사용한 이메일을 입력하면 재설정 안내를 보내드려요.
            </p>
          </div>
          <ForgotPasswordForm />
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
