"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signInAsGuest } from "@/features/auth/actions";

export function GuestSignInButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await signInAsGuest();
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("게스트 로그인에 실패했어요. 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? "게스트 계정 생성 중..." : "게스트로 둘러보기"}
      </Button>
      {error && <p className="text-destructive text-center text-xs">{error}</p>}
    </div>
  );
}
