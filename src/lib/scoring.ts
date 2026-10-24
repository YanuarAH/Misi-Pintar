/** Aturan skor & XP. Semua nilai dihitung di server. */

export const XP_PER_CORRECT = 10;
export const XP_MISSION_BONUS = 20;

export function computeScore(correctCount: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100);
}

export function computeXp(correctCount: number, completed: boolean): number {
  const safeCorrect = Math.max(0, Math.floor(correctCount));
  return safeCorrect * XP_PER_CORRECT + (completed ? XP_MISSION_BONUS : 0);
}

export function accuracyLabel(accuracy: number): string {
  if (accuracy >= 90) return "Sangat baik";
  if (accuracy >= 80) return "Baik";
  if (accuracy >= 60) return "Cukup";
  return "Perlu latihan tambahan";
}
