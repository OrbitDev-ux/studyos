"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { LOCALE_CONFIG, SUPPORTED_LOCALES, type Locale } from "@/features/i18n/config";
import { setLocalePreference } from "@/features/i18n/actions";
import { useI18n } from "@/features/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * 언어 설정: 자동 + 지원 언어 목록. 선택 시 서버에 저장(검증)하고, 클라이언트 provider를
 * 즉시 갱신해 화면을 바로 바꾼 뒤 router.refresh로 서버 렌더 문자열도 동기화한다.
 */
export function LanguageSelect({ initialMode }: { initialMode: "auto" | "manual" }) {
  const router = useRouter();
  const { toast } = useToast();
  const { locale, messages, setLocaleState } = useI18n();
  const [mode, setMode] = useState<"auto" | "manual">(initialMode);
  const [pending, startTransition] = useTransition();

  function choose(value: "auto" | Locale) {
    startTransition(async () => {
      const res = await setLocalePreference(value);
      if (res.error) {
        toast({ title: res.error });
        return;
      }
      setMode(res.mode ?? "manual");
      if (res.locale) setLocaleState(res.locale as Locale);
      toast({ title: messages.language.saved });
      router.refresh();
    });
  }

  const options: { key: string; value: "auto" | Locale; label: string; hint?: string; active: boolean }[] = [
    {
      key: "auto",
      value: "auto",
      label: messages.language.auto,
      hint: messages.language.autoHint,
      active: mode === "auto",
    },
    ...SUPPORTED_LOCALES.map((l) => ({
      key: l,
      value: l,
      label: LOCALE_CONFIG[l].label,
      active: mode === "manual" && locale === l,
    })),
  ];

  return (
    <div role="radiogroup" aria-label={messages.language.title} className="flex flex-col gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={o.active}
          disabled={pending}
          onClick={() => choose(o.value)}
          className={cn(
            "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors",
            o.active ? "border-primary bg-primary/5" : "hover:bg-muted",
          )}
        >
          <span>
            <span className="font-medium">{o.label}</span>
            {o.hint && <span className="text-muted-foreground ml-2 text-xs">{o.hint}</span>}
          </span>
          {o.active && <Check className="text-primary size-4 shrink-0" />}
        </button>
      ))}
    </div>
  );
}
