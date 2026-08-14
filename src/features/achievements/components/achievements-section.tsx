import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AchievementSectionCopy } from "@/features/achievements/copy";
import type { EvaluatedAchievement } from "@/features/achievements/queries";
import { cn } from "@/lib/utils";

/**
 * Profile achievement grid. Earned badges render in full colour; locked ones
 * are dimmed with a lock marker. Server-computed `earned` flags only — the UI
 * never decides eligibility. Responsive grid works on mobile and desktop.
 */
export function AchievementsSection({
  items,
  earnedCount,
  copy,
}: {
  items: EvaluatedAchievement[];
  earnedCount: number;
  copy: AchievementSectionCopy;
}) {
  // Earned first, keeping definition order within each group.
  const ordered = [...items].sort((a, b) => Number(b.earned) - Number(a.earned));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">🏆 {copy.sectionTitle}</CardTitle>
        <span className="text-muted-foreground text-sm tabular-nums">
          {copy.progress
            .replace("{earned}", String(earnedCount))
            .replace("{total}", String(items.length))}
        </span>
      </CardHeader>
      <CardContent>
        {earnedCount === 0 && (
          <p className="text-muted-foreground mb-3 text-sm">{copy.empty}</p>
        )}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ordered.map((item) => {
            const text = copy.items[item.id];
            return (
              <li
                key={item.id}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                  item.earned ? "border-primary/30 bg-primary/5" : "opacity-60",
                )}
              >
                <span
                  className={cn("text-2xl", !item.earned && "grayscale")}
                  aria-hidden
                >
                  {item.earned ? item.icon : "🔒"}
                </span>
                <span className="text-sm font-medium">{text.title}</span>
                <span className="text-muted-foreground text-xs leading-snug">
                  {text.description}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
