import { ACHIEVEMENTS, isAchievementKey } from "@/lib/achievements";
import { cn } from "@/lib/cn";

export function AchievementBadge({
  achievementKey,
  locked = false,
  className,
}: {
  achievementKey: string;
  locked?: boolean;
  className?: string;
}) {
  if (!isAchievementKey(achievementKey)) return null;
  const achievement = ACHIEVEMENTS[achievementKey];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3.5 py-3",
        locked ? "border-line bg-paper/60 opacity-60" : "border-sun/40 bg-sun-soft",
        className,
      )}
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        {achievement.emoji}
      </span>
      <div>
        <p className="text-sm font-black text-ink">{achievement.title}</p>
        <p className="text-xs leading-snug text-muted">{achievement.description}</p>
      </div>
    </div>
  );
}
