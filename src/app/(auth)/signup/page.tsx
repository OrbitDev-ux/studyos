import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { EmailSignUpForm } from "@/features/auth/components/email-sign-up-form";
import { GuestSignInButton } from "@/features/auth/components/guest-sign-in-button";

export default function SignUpPage() {
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
            <h1 className="text-lg font-semibold tracking-tight">
              {siteConfig.name} 시작하기
            </h1>
            <p className="text-muted-foreground text-sm">
              AI 문제 · 오답 DNA · 나만의 교재를 무료로 체험해보세요.
            </p>
          </div>
          <EmailSignUpForm />
          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">또는</span>
            <span className="bg-border h-px flex-1" />
          </div>
          <GuestSignInButton />
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link href="/demo">👀 로그인 없이 둘러보기</Link>
          </Button>
          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            게스트로 시작하면{" "}
            <Link href="/legal/terms" className="underline">
              이용약관
            </Link>{" "}
            및{" "}
            <Link href="/legal/privacy" className="underline">
              개인정보 처리방침
            </Link>
            에 동의하는 것으로 간주됩니다.
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
