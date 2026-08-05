import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/features/auth/actions";
import { GoogleIcon } from "@/features/auth/components/google-icon";

export function GoogleSignInButton() {
  return (
    <form action={signInWithGoogle}>
      <Button type="submit" size="lg" className="w-full gap-2">
        <GoogleIcon />
        Google로 계속하기
      </Button>
    </form>
  );
}
