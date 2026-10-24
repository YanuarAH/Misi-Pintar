/** Avatar sederhana tanpa data pribadi: hanya kunci + emoji. */

export const AVATARS = [
  { key: "rubah", emoji: "🦊", label: "Rubah" },
  { key: "panda", emoji: "🐼", label: "Panda" },
  { key: "kucing", emoji: "🐱", label: "Kucing" },
  { key: "burung-hantu", emoji: "🦉", label: "Burung Hantu" },
  { key: "kelinci", emoji: "🐰", label: "Kelinci" },
  { key: "singa", emoji: "🦁", label: "Singa" },
  { key: "kura-kura", emoji: "🐢", label: "Kura-kura" },
  { key: "lumba-lumba", emoji: "🐬", label: "Lumba-lumba" },
] as const;

export type AvatarKey = (typeof AVATARS)[number]["key"];

export const AVATAR_KEYS = AVATARS.map((avatar) => avatar.key) as AvatarKey[];

export function avatarEmoji(key: string | null | undefined): string {
  return AVATARS.find((avatar) => avatar.key === key)?.emoji ?? "🦊";
}

export function avatarLabel(key: string | null | undefined): string {
  return AVATARS.find((avatar) => avatar.key === key)?.label ?? "Rubah";
}
