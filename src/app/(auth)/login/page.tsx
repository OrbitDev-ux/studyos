import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { EmailSignInForm } from "@/features/auth/components/email-sign-in-form";
import { GuestSignInButton } from "@/features/auth/components/guest-sign-in-button";

export default function LoginPage() {
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
            <h1 className="text-lg font-semibold tracking-tight">다시 오신 걸 환영해요</h1>
            <p className="text-muted-foreground text-sm">
              오늘도 한 문제씩, 나만의 학습을 이어가요.
            </p>
          </div>
          <EmailSignInForm />
          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">또는</span>
            <span className="bg-border h-px flex-1" />
          </div>
          <GuestSignInButton />
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link href="/demo">👀 로그인 없이 둘러보기</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
