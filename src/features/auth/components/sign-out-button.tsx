import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm" className="gap-2">
        <LogOut className="size-4" />
        로그아웃
      </Button>
    </form>
  );
}
