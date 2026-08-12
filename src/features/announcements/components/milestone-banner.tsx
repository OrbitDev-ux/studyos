"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isMilestoneBannerActive,
  MILESTONE_DISMISS_KEY,
} from "@/features/announcements/milestone";

/**
 * 서비스 1주 기념 배너. 기존 디자인 시스템(primary 그라디언트 + Button)만 사용하고
 * 새 라이브러리는 추가하지 않는다.
 *
 * - 노출 여부는 실제 시작일 기반 창(isMilestoneBannerActive)으로 판단 → 기간이 지나면
 *   자동으로 사라진다.
 * - 닫으면 sessionStorage에 기록 → 같은 세션에서는 새로고침해도 다시 뜨지 않고,
 *   새 세션(재방문)에서는 다시 노출된다.
 * - 클라이언트에서만 렌더(마운트 후) → SSR/CSR 하이드레이션 불일치 방지.
 * - 통계 숫자 없음: 제공된 문구만 표시한다.
 */
export function MilestoneBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMilestoneBannerActive()) return;
    try {
      if (sessionStorage.getItem(MILESTONE_DISMISS_KEY) === "1") return;
    } catch {
      // sessionStorage 접근 불가(프라이빗 모드 등) — 그냥 노출한다.
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(MILESTONE_DISMISS_KEY, "1");
    } catch {
      // 저장 실패해도 최소한 이번 렌더에서는 닫는다.
    }
    setVisible(false);
  }

  return (
    <div
      role="status"
      className="from-primary/12 border-primary/20 relative flex items-start gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br via-primary/5 to-transparent p-4 sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold sm:text-base">🎂 StudyOS 1주 축하!</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed sm:text-sm">
          여러분과 함께한 첫 번째 일주일이에요. 앞으로도 더 좋은 학습 경험을 만들어갈게요! 🚀
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground -m-1 shrink-0"
        onClick={dismiss}
        aria-label="배너 닫기"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
