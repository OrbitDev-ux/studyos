import type { Locale } from "@/features/i18n/config";

const DURATION_UNITS: Record<Locale, { hour: string; minute: string; sep: string }> = {
  "ko-KR": { hour: "시간", minute: "분", sep: " " },
  "en-US": { hour: "h", minute: "m", sep: " " },
  "ja-JP": { hour: "時間", minute: "分", sep: "" },
  "zh-CN": { hour: "小时", minute: "分钟", sep: "" },
};

/**
 * Locale-aware "Xh Ym" style duration. Replaces the old Korean-only formatter;
 * every caller passes the request's resolved locale (server) or the useI18n
 * locale (client) so the unit words match the UI language.
 */
export function formatDuration(totalSeconds: number, locale: Locale): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const u = DURATION_UNITS[locale];

  if (hours === 0 && minutes === 0) return `0${u.minute}`;
  if (hours === 0) return `${minutes}${u.minute}`;
  if (minutes === 0) return `${hours}${u.hour}`;
  return `${hours}${u.hour}${u.sep}${minutes}${u.minute}`;
}
