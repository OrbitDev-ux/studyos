import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import type { FriendActivityItem } from "@/features/social/activity";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import { formatRelativeTime } from "@/lib/date";
import { formatDuration } from "@/lib/format";

/** Recent friend study-session/goal-completion activity, newest first. Reuses
 * ProfileNameplate (same avatar → ProfileCard interaction as FriendList) so
 * clicking a row's avatar/name opens that friend's profile card. */
export function ActivityFeed({
  items,
  t,
  locale,
}: {
  items: FriendActivityItem[];
  t: Messages["social"];
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.activityTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.activityEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="flex items-center justify-between gap-2"
              >
                <ProfileNameplate
                  userId={item.userId}
                  name={item.name}
                  image={item.image}
                  fallbackLabel={t.unknownUser}
                />
                <div className="flex flex-col items-end text-right">
                  <span className="text-sm">
                    {item.kind === "study_session"
                      ? item.subjectName
                        ? t.activityStudiedWithSubject
                            // Function replacers (not strings): subjectName is
                            // a friend's freely-named Subject, and a plain
                            // string replacement would interpret `$&`/`$$`
                            // specials inside it, corrupting this feed row on
                            // the VIEWER's screen (Codebase audit).
                            .replace("{subject}", () => item.subjectName!)
                            .replace("{duration}", () =>
                              formatDuration(item.durationSec, locale),
                            )
                        : t.activityStudiedNoSubject.replace("{duration}", () =>
                            formatDuration(item.durationSec, locale),
                          )
                      : t.activityGoalCompleted.replace("{title}", () => item.title)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(item.occurredAt, locale)}
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
