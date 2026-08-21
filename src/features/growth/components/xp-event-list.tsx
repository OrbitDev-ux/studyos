import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getRecentXpEvents } from "@/features/growth/queries";
import type { XpType } from "@/features/growth/xp";
import { formatRelativeTime } from "@/lib/date";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";

function xpEventLabel(t: Messages["growth"], type: string): string {
  switch (type as XpType) {
    case "MISSION_COMPLETED":
      return t.xpEventMissionCompleted;
    case "STUDY_TIME":
      return t.xpEventStudyTime;
    case "REVIEW_COMPLETED":
      return t.xpEventReviewCompleted;
    case "PROBLEM_SOLVED":
      return t.xpEventProblemSolved;
    case "GOAL_COMPLETED":
      return t.xpEventGoalCompleted;
    case "ALL_MISSIONS_BONUS":
      return t.xpEventAllMissionsBonus;
    default:
      return type;
  }
}

export function XpEventList({
  events,
  locale,
  t,
}: {
  events: Awaited<ReturnType<typeof getRecentXpEvents>>;
  locale: Locale;
  t: Messages["growth"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.activityTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.activityEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{xpEventLabel(t, event.type)}</span>
                <div className="text-muted-foreground flex shrink-0 items-center gap-3 tabular-nums">
                  <span className="text-success font-medium">
                    {t.xpAmount.replace("{amount}", event.amount.toLocaleString())}
                  </span>
                  <span className="text-xs">
                    {formatRelativeTime(event.createdAt, locale)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
