/** Katalog lencana dan aturan pemberiannya. */

export const ACHIEVEMENT_KEYS = [
  "penjelajah",
  "bintang_misi",
  "sempurna",
  "pembelajar_tekun",
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

export type AchievementDefinition = {
  key: AchievementKey;
  title: string;
  description: string;
  emoji: string;
};

export const ACHIEVEMENTS: Record<AchievementKey, AchievementDefinition> = {
  penjelajah: {
    key: "penjelajah",
    title: "Penjelajah",
    description: "Menyelesaikan misi pertamamu sampai akhir.",
    emoji: "🧭",
  },
  bintang_misi: {
    key: "bintang_misi",
    title: "Bintang Misi",
    description: "Mendapat akurasi minimal 80% dalam satu percobaan.",
    emoji: "⭐",
  },
  sempurna: {
    key: "sempurna",
    title: "Sempurna",
    description: "Menjawab semua soal dengan benar dalam satu percobaan.",
    emoji: "🏅",
  },
  pembelajar_tekun: {
    key: "pembelajar_tekun",
    title: "Pembelajar Tekun",
    description: "Menyelesaikan ketiga misi Matematika.",
    emoji: "📚",
  },
};

export function isAchievementKey(value: string): value is AchievementKey {
  return (ACHIEVEMENT_KEYS as readonly string[]).includes(value);
}

export type AchievementInput = {
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  completedMissionCount: number;
  hadCompletedMissionBefore: boolean;
};

/** Menentukan lencana yang layak didapat dari satu percobaan yang baru selesai. */
export function evaluateAchievements(input: AchievementInput): AchievementKey[] {
  const earned: AchievementKey[] = [];

  if (!input.hadCompletedMissionBefore) earned.push("penjelajah");
  if (input.totalQuestions > 0 && input.accuracy >= 80) earned.push("bintang_misi");
  if (input.totalQuestions > 0 && input.correctCount === input.totalQuestions) earned.push("sempurna");
  if (input.completedMissionCount >= 3) earned.push("pembelajar_tekun");

  return earned;
}
