export type ThemeEvent = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  theme: "midnight";
  copy: string;
  enabled: boolean;
};

const releaseAt = new Date(
  process.env.NEXT_PUBLIC_STUDYOS_BUILD_RELEASE_AT ?? "2026-09-27T00:00:00.000Z",
);

export const THEME_EVENTS: readonly ThemeEvent[] = [
  {
    id: "midnight-study-week",
    name: "MIDNIGHT STUDY WEEK",
    startsAt: releaseAt,
    endsAt: new Date(releaseAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    theme: "midnight",
    copy: "7일 동안, 밤의 고요함 속에서 오늘의 공부를 이어가요.",
    enabled: true,
  },
];

export function getActiveThemeEvent(now = new Date()): ThemeEvent | null {
  return (
    THEME_EVENTS.find(
      (event) => event.enabled && now >= event.startsAt && now < event.endsAt,
    ) ?? null
  );
}

export function isThemeEventActive(event: ThemeEvent, now = new Date()): boolean {
  return event.enabled && now >= event.startsAt && now < event.endsAt;
}
