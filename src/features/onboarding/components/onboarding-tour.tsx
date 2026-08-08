"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { completeTutorial } from "@/features/onboarding/actions";
import { stepsFor, type TourStep } from "@/features/onboarding/steps";

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Spotlight onboarding tour. Auto-starts for new users (initialOpen), or is
 * launched on demand ("튜토리얼 다시 보기"). Each step either highlights a real
 * element carrying `data-tour="<target>"` (measured live so it survives
 * responsive layout / scroll) or shows a centered card when there's no target /
 * the target isn't on screen. Finishing or skipping persists completion so it
 * never auto-reopens.
 */
export function OnboardingTour({
  initialOpen,
  isGuest = false,
  steps: stepsProp,
  onComplete,
  onClose,
}: {
  initialOpen: boolean;
  isGuest?: boolean;
  /** Explicit step list; defaults to the app flow chosen by `isGuest`. */
  steps?: TourStep[];
  /** Called on finish/skip instead of persisting via the server action. Used by
   * the public demo (no auth/DB) — omit it for the signed-in app. */
  onComplete?: () => void;
  /** Notifies a parent launcher when the tour closes (to reset its state). */
  onClose?: () => void;
}) {
  const steps = stepsProp ?? stepsFor(isGuest);
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [, startSaving] = useTransition();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(initialOpen), [initialOpen]);

  const step: TourStep | undefined = steps[index];
  const target = step?.target ?? null;

  // Measure the current target element; re-measure on scroll/resize so the
  // spotlight tracks the real element. Null rect → centered card fallback.
  const measure = useCallback(() => {
    if (!target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [target]);

  useLayoutEffect(() => {
    if (!open) return;
    // Bring the target into view first, then measure on the next frame.
    if (target) {
      document
        .querySelector<HTMLElement>(`[data-tour="${target}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, target, measure]);

  function finish() {
    setOpen(false);
    onClose?.();
    if (onComplete) {
      // Demo (or any caller) handles completion itself — no server write.
      onComplete();
      return;
    }
    // Persist completion so the tour never auto-reopens. Fire-and-forget: the
    // UI closes immediately and the write is scoped to the current user.
    startSaving(() => {
      void completeTutorial();
    });
  }

  if (!mounted || !open || !step) return null;

  const isLast = index === steps.length - 1;
  const PAD = 8;
  const spotlight: Rect | null = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Tooltip position: under the spotlight if there's room, else above; centered
  // when there's no target.
  const CARD_W = 340;
  let cardStyle: React.CSSProperties;
  if (spotlight) {
    const below = spotlight.top + spotlight.height + 12;
    const roomBelow = window.innerHeight - below > 220;
    const top = roomBelow ? below : Math.max(12, spotlight.top - 12 - 200);
    const left = Math.min(
      Math.max(12, spotlight.left),
      window.innerWidth - CARD_W - 12,
    );
    cardStyle = { position: "fixed", top, left, width: CARD_W };
  } else {
    cardStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: CARD_W,
    };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="StudyOS 튜토리얼">
      {/* Dimmed backdrop. Clicking it does nothing (avoids accidental skips). */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Spotlight ring around the target element. */}
      {spotlight && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-white transition-all"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      )}

      {/* Step card. */}
      <div
        className="bg-background text-foreground flex flex-col gap-3 rounded-xl border p-5 shadow-2xl"
        style={cardStyle}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{step.title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={
                i === index
                  ? "bg-primary size-1.5 rounded-full"
                  : "bg-muted-foreground/30 size-1.5 rounded-full"
              }
            />
          ))}
          <span className="ml-1 tabular-nums">
            {index + 1} / {steps.length}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>
            건너뛰기
          </Button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                이전
              </Button>
            )}
            {step.cta ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  finish();
                  router.push(step.cta!.href);
                }}
              >
                {step.cta.label}
              </Button>
            ) : isLast ? (
              <Button type="button" size="sm" onClick={finish}>
                완료
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
              >
                다음
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
