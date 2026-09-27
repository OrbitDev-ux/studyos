export type ThemeEvent = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  theme: string;
  copy: string;
  enabled: boolean;
  missions: { id: string; label: string }[];
  action: { label: string; href: string };
};

export const THEME_EVENTS: readonly ThemeEvent[] = [
  {
    id: "midnight-study-week",
    name: "MIDNIGHT STUDY WEEK",
    startsAt: new Date("2026-09-26T23:59:58.000Z"),
    endsAt: new Date("2026-10-03T23:59:58.000Z"),
    theme: "midnight",
    copy: "7일 동안, 밤의 고요함 속에서 오늘의 공부를 이어가요.",
    enabled: true,
    missions: [
      { id: "study-session", label: "학습 세션 시작" },
      { id: "today-focus", label: "오늘의 할 일 완료" },
    ],
    action: { label: "공부 시작", href: "/problems" },
  },
];

export function getActiveThemeEvent(now = new Date()): ThemeEvent | null {
  return (
    THEME_EVENTS.find(
      (event) => event.enabled && now >= event.startsAt && now < event.endsAt,
    ) ?? null
  );
}

export function getScheduledThemeEvent(now = new Date()): ThemeEvent | null {
  return THEME_EVENTS.find((event) => event.enabled && now < event.endsAt) ?? null;
}

export function isThemeEventActive(event: ThemeEvent, now = new Date()): boolean {
  return event.enabled && now >= event.startsAt && now < event.endsAt;
}
