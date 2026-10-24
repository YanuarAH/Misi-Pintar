import { z } from "zod";
import { AVATAR_KEYS } from "./avatars";
import { parseNumericAnswer } from "./normalize";
import { TOPIC_KEYS } from "./topics";

const namePattern = /^[\p{L}\p{N} .,'-]+$/u;
const pinPattern = /^\d{4,6}$/;
const classCodePattern = /^[A-Z0-9]{6}$/;
const accessCodePattern = /^[A-Z0-9]{6,12}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Nama tampilan minimal 2 huruf.")
  .max(40, "Nama tampilan maksimal 40 huruf.")
  .regex(namePattern, "Gunakan huruf, angka, spasi, titik, koma, atau tanda hubung saja.");

export const pinSchema = z
  .string()
  .trim()
  .regex(pinPattern, "PIN harus 4-6 angka.");

export const classCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(classCodePattern, "Kode kelas terdiri dari 6 huruf atau angka.");

export const teacherLoginSchema = z.object({
  email: z.string().trim().toLowerCase().min(5, "Email wajib diisi.").max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Format email belum benar."),
  password: z.string().min(8, "Password minimal 8 karakter.").max(200),
});

export const studentLoginSchema = z.object({
  accessCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(accessCodePattern, "Kode siswa terdiri dari 6-12 huruf atau angka."),
  pin: pinSchema,
});

export const studentRegisterSchema = z.object({
  joinCode: classCodeSchema,
  displayName: displayNameSchema,
  pin: pinSchema,
  avatarKey: z.enum(AVATAR_KEYS as unknown as [string, ...string[]]),
});

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
  avatarKey: z.enum(AVATAR_KEYS as unknown as [string, ...string[]]),
});

export const classSchema = z.object({
  name: z.string().trim().min(2, "Nama kelas minimal 2 huruf.").max(60, "Nama kelas maksimal 60 huruf."),
  gradeLevel: z.coerce
    .number({ message: "Pilih tingkat kelas." })
    .int()
    .min(1, "Tingkat kelas 1-6.")
    .max(6, "Tingkat kelas 1-6."),
});

export const missionSchema = z.object({
  title: z.string().trim().min(3, "Judul misi minimal 3 huruf.").max(80, "Judul misi maksimal 80 huruf."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug minimal 3 karakter.")
    .max(60)
    .regex(slugPattern, "Slug hanya boleh huruf kecil, angka, dan tanda hubung."),
  description: z.string().trim().max(600, "Deskripsi maksimal 600 karakter.").default(""),
  story: z.string().trim().max(2000, "Cerita maksimal 2000 karakter.").default(""),
  learningObjectives: z
    .array(z.string().trim().min(3, "Tujuan pembelajaran terlalu pendek.").max(160))
    .max(8, "Maksimal 8 tujuan pembelajaran.")
    .default([]),
  orderIndex: z.coerce.number().int().min(1, "Urutan minimal 1.").max(99),
  gradeLevel: z.coerce
    .number({ message: "Pilih tingkat kelas misi." })
    .int()
    .min(1, "Tingkat kelas 1-6.")
    .max(6, "Tingkat kelas 1-6."),
  subject: z.string().trim().min(2, "Pilih mata pelajaran.").max(40),
  topic: z.string().trim().min(2, "Pilih topik/materi.").max(60),
});

export type QuestionInput = {
  questionType: "multiple_choice" | "numeric";
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
  difficulty: "mudah" | "sedang" | "tantangan";
  orderIndex: number;
  topic: string;
  /** Slot soal dalam misi; varian boleh berbagi slot yang sama. */
  slotIndex?: number;
};

export const questionSchema = z
  .object({
    questionType: z.enum(["multiple_choice", "numeric"]),
    prompt: z.string().trim().min(5, "Pertanyaan minimal 5 karakter.").max(1000, "Pertanyaan maksimal 1000 karakter."),
    options: z.array(z.string().trim()).max(6, "Maksimal 6 pilihan jawaban.").default([]),
    correctAnswer: z.string().trim().min(1, "Jawaban benar wajib diisi.").max(300),
    explanation: z.string().trim().min(5, "Penjelasan wajib diisi.").max(1200, "Penjelasan maksimal 1200 karakter."),
    hint: z.string().trim().max(300, "Petunjuk maksimal 300 karakter.").default(""),
    difficulty: z.enum(["mudah", "sedang", "tantangan"]),
    orderIndex: z.coerce.number().int().min(1).max(99),
    topic: z.enum(TOPIC_KEYS as [string, ...string[]]).default("umum"),
    /** Bila kosong, soal baru memakai slot = orderIndex (perilaku lama). */
    slotIndex: z.coerce.number().int().min(1, "Slot minimal 1.").max(50, "Slot maksimal 50.").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.questionType === "multiple_choice") {
      const options = value.options.map((option) => option.trim()).filter(Boolean);
      if (options.length < 2) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "Soal pilihan ganda butuh minimal 2 pilihan." });
        return;
      }
      const unique = new Set(options.map((option) => option.toLocaleLowerCase("id-ID")));
      if (unique.size !== options.length) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "Pilihan jawaban tidak boleh ada yang sama." });
      }
      if (!options.some((option) => option.toLocaleLowerCase("id-ID") === value.correctAnswer.toLocaleLowerCase("id-ID"))) {
        ctx.addIssue({
          code: "custom",
          path: ["correctAnswer"],
          message: "Jawaban benar harus salah satu dari pilihan yang tersedia.",
        });
      }
    } else {
      if (parseNumericAnswer(value.correctAnswer) === null) {
        ctx.addIssue({
          code: "custom",
          path: ["correctAnswer"],
          message: "Jawaban soal angka harus berupa angka (contoh: 12500 atau 1,5).",
        });
      }
      if (value.options.some(Boolean)) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "Soal angka tidak memakai pilihan jawaban." });
      }
    }
  });

export type MissionInput = z.infer<typeof missionSchema>;
export type QuestionFormInput = z.infer<typeof questionSchema>;

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data belum valid.";
}
