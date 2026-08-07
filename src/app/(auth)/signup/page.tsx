import Link from "next/link";
import { siteConfig } from "@/config/site";
import { EmailSignUpForm } from "@/features/auth/components/email-sign-up-form";
import { GuestSignInButton } from "@/features/auth/components/guest-sign-in-button";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {siteConfig.name} 시작하기
        </h1>
        <p className="text-muted-foreground text-sm">{siteConfig.description}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-4">
        <EmailSignUpForm />
        <div className="flex items-center gap-3">
          <span className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs">또는</span>
          <span className="bg-border h-px flex-1" />
        </div>
        <GuestSignInButton />
        <p className="text-muted-foreground text-center text-sm">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
