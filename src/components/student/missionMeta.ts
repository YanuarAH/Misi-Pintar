export type MissionVisual = { emoji: string; label: string; tint: string };

/** Ikon misi ditentukan dari slug agar guru bisa membuat misi baru tanpa mengubah kode. */
export function missionVisual(slug: string): MissionVisual {
  if (slug.includes("pasar")) return { emoji: "🛒", label: "Pasar", tint: "bg-sun-soft" };
  if (slug.includes("koki") || slug.includes("pecahan")) return { emoji: "🧁", label: "Dapur", tint: "bg-coral-soft" };
  if (slug.includes("arsitek") || slug.includes("bangun")) return { emoji: "📐", label: "Taman", tint: "bg-primary-soft" };
  return { emoji: "✨", label: "Petualangan", tint: "bg-sky-soft" };
}
