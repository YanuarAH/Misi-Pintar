import { avatarEmoji, avatarLabel } from "@/lib/avatars";
import { cn } from "@/lib/cn";

export function Avatar({
  avatarKey,
  size = "md",
  className,
}: {
  avatarKey: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-9 text-xl",
    md: "size-12 text-2xl",
    lg: "size-16 text-4xl",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-line-strong bg-sun-soft",
        sizes[size],
        className,
      )}
      role="img"
      aria-label={`Avatar ${avatarLabel(avatarKey)}`}
      title={avatarLabel(avatarKey)}
    >
      {avatarEmoji(avatarKey)}
    </span>
  );
}
