"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { selectLoginMessage } from "@/features/login-experience/select";
import type { LoginMessage, Rarity, Role } from "@/features/login-experience/messages";
import { cn } from "@/lib/utils";

const DISPLAY_MS = 2500;
const EXIT_MS = 350;

// Only shown for these rarities; drives the glow colour and the small tier label.
// Kept restrained (low opacity, no raw neon palette colors) — this plays once
// per login, not a persistent game-UI element, so it should read as a quiet
// brand moment rather than a loot-box flash.
const RARITY_GLOW: Record<Rarity, string> = {
  common: "bg-primary/14",
  rare: "bg-info/18",
  epic: "bg-violet-500/16",
  legendary: "bg-warning/20",
};
const RARITY_LABEL: Partial<Record<Rarity, string>> = {
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};

/**
 * Post-login brand moment. Shows once, only when the URL carries ?welcome=1
 * (set on the sign-in redirect); the param is stripped immediately so a
 * refresh or back-navigation never replays it. Dark blur backdrop + centered
 * card with fade/scale/glow, auto-dismissing after 2.5s, or on ESC / click.
 * The dashboard renders behind it and is revealed as the overlay fades out.
 */
export function LoginExperience({ role }: { role: Role }) {
  const [message, setMessage] = useState<LoginMessage | null>(null);
  const [leaving, setLeaving] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setLeaving(true);
    exitTimer.current = setTimeout(() => setMessage(null), EXIT_MS);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") !== "1") return;

    // Strip the trigger so it plays exactly once.
    params.delete("welcome");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );

    setMessage(selectLoginMessage({ role, date: new Date() }));
    autoTimer.current = setTimeout(dismiss, DISPLAY_MS);

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [role, dismiss]);

  useEffect(() => {
    if (!message) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [message, dismiss]);

  if (!message) return null;

  const isHero = message.variant === "hero";
  const tierLabel = RARITY_LABEL[message.rarity];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="로그인 환영 메시지"
      onClick={dismiss}
      className={cn(
        "bg-background/70 fixed inset-0 z-100 flex cursor-pointer items-center justify-center p-6 backdrop-blur-md",
        leaving
          ? "animate-out fade-out-0 duration-300"
          : "animate-in fade-in-0 duration-500",
      )}
    >
      {/* Glow — soft and small, a hint of color behind the card, not a spotlight. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute size-56 rounded-full blur-2xl",
          RARITY_GLOW[message.rarity],
        )}
      />

      <div
        className={cn(
          "glass-panel ring-foreground/10 relative flex flex-col items-center gap-3 rounded-2xl px-10 text-center shadow-lg ring-1",
          isHero ? "py-12" : "py-9",
          leaving
            ? "animate-out fade-out-0 zoom-out-95 duration-300"
            : "animate-in fade-in-0 zoom-in-95 duration-500",
        )}
      >
        {message.brand && (
          <span className="text-muted-foreground text-sm font-medium tracking-tight">
            🌙 StudyOS
          </span>
        )}

        {tierLabel && (
          <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em]">
            {tierLabel}
          </span>
        )}

        <h2
          className={cn(
            "font-semibold tracking-tight text-balance",
            isHero ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
          )}
        >
          {message.title}
        </h2>

        {message.message && (
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
            {message.message}
          </p>
        )}
      </div>
    </div>
  );
}
