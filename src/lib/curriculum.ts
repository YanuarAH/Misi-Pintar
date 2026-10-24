/**
 * Tingkat kelas SD dan label tampilan. Tingkat kelas (1-6) berbeda dari kelas belajar
 * (mis. "5A") yang dikelola guru di tabel `classes`.
 *
 * Daftar mata pelajaran dan topik disimpan di database (`subjects`, `mission_topics`) agar
 * guru dapat menambah materi tanpa mengubah kode; modul ini hanya menyediakan label tingkat.
 */

export const GRADE_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const UNCATEGORIZED_LABEL = "Belum dikategorikan";

export function isGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === "number" && GRADE_LEVELS.includes(value as GradeLevel);
}

export function gradeLabel(grade: number | null | undefined): string {
  return isGradeLevel(grade) ? `Kelas ${grade} SD` : UNCATEGORIZED_LABEL;
}

/** "Kelas 5 SD · Matematika · Pecahan" — dipakai di kartu misi dan header. */
export function curriculumLabel(input: {
  gradeLevel: number | null;
  subjectLabel?: string | null;
  topicLabel?: string | null;
}): string {
  return [gradeLabel(input.gradeLevel), input.subjectLabel, input.topicLabel].filter(Boolean).join(" · ");
}
