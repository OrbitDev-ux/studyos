import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{siteConfig.name}</h1>
        <p className="text-muted-foreground text-sm">{siteConfig.description}</p>
      </div>
      <div className="w-full max-w-xs">
        <GoogleSignInButton />
      </div>
    </div>
  );
}
