import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Persistent DEMO MODE banner shown on every /demo page. Makes it unmistakable
 * that this is throwaway demo data and offers a always-available sign-up CTA
 * (without forcing it — the demo is fully usable without an account).
 */
export function DemoBanner() {
  return (
    <div className="bg-primary/10 border-primary/20 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <Gamepad2 className="text-primary size-4 shrink-0" />
        <span className="font-medium">DEMO MODE</span>
        <span className="text-muted-foreground hidden sm:inline">
          — 체험용 Demo 데이터입니다. 실제 학습 기록은 저장되지 않아요.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href="/login">로그인</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/signup">무료로 시작하기</Link>
        </Button>
      </div>
    </div>
  );
}
