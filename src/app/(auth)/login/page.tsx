import Link from "next/link";
import { siteConfig } from "@/config/site";
import { EmailSignInForm } from "@/features/auth/components/email-sign-in-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{siteConfig.name}</h1>
        <p className="text-muted-foreground text-sm">{siteConfig.description}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-4">
        <EmailSignInForm />
        <p className="text-muted-foreground text-center text-sm">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
