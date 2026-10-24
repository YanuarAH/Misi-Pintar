"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelAttempt,
  completeAttempt,
  joinClassWithCode,
  leaveClass,
  setStudentGrade,
  startOrResumeAttempt,
  startPracticeAttempt,
  submitAnswer,
  updateStudentProfile,
} from "@/server/student";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { joinClassSchema, profileUpdateSchema, studentGradeSchema } from "@/lib/validation";
import type { AnswerFeedback } from "@/server/types";

/** Membuat/melanjutkan percobaan lewat POST, lalu membuka halaman pengerjaan. */
export async function startMissionAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");

  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug || session.role !== "student") redirect("/belajar");

  let failure: string | null = null;
  try {
    const result = await startOrResumeAttempt({ userId: session.id, role: "student" }, session.id, slug);
    if (!result.ok) {
      failure =
        result.reason === "locked"
          ? "Misi ini masih terkunci. Selesaikan misi sebelumnya dulu."
          : result.reason === "empty"
            ? "Misi ini belum punya soal."
            : "Misi tidak ditemukan.";
    }
  } catch (error) {
    console.error("startMissionAction", error);
    failure = "Misi gagal dibuka. Periksa koneksi lalu coba lagi.";
  }

  if (failure) redirect(`/misi/${slug}?error=${encodeURIComponent(failure)}`);
  redirect(`/misi/${slug}/main`);
}

export type AnswerActionResult =
  | { ok: true; feedback: AnswerFeedback }
  | { ok: false; error: string };

export async function submitAnswerAction(input: {
  attemptId: string;
  questionId: string;
  answer: string;
}): Promise<AnswerActionResult> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return { ok: false, error: "Sesi kamu sudah berakhir. Silakan masuk lagi." };
  }

  if (typeof input?.attemptId !== "string" || typeof input?.questionId !== "string") {
    return { ok: false, error: "Permintaan tidak valid." };
  }

  try {
    const result = await submitAnswer({ userId: session.id, role: "student" }, session.id, {
      attemptId: input.attemptId,
      questionId: input.questionId,
      answer: String(input.answer ?? ""),
    });
    if (!result.ok) return { ok: false, error: result.reason };
    return { ok: true, feedback: result.feedback };
  } catch (error) {
    console.error("submitAnswerAction", error);
    return { ok: false, error: "Jawaban gagal diperiksa. Periksa koneksi lalu coba lagi." };
  }
}

export async function completeAttemptAction(attemptId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return { ok: false, error: "Sesi kamu sudah berakhir. Silakan masuk lagi." };
  }

  try {
    const result = await completeAttempt({ userId: session.id, role: "student" }, session.id, attemptId);
    if (!result.ok) return { ok: false, error: result.reason };
    revalidatePath("/belajar");
    revalidatePath("/progres");
    revalidatePath(`/hasil/${attemptId}`);
    return { ok: true };
  } catch (error) {
    console.error("completeAttemptAction", error);
    return { ok: false, error: "Hasil misi gagal disimpan. Coba lagi, ya." };
  }
}

/** Memulai latihan dari soal yang salah pada percobaan tertentu. */
export async function startPracticeAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/masuk");

  const sourceAttemptId = String(formData.get("sourceAttemptId") ?? "");
  const result = await startPracticeAttempt({ userId: session.id, role: "student" }, session.id, sourceAttemptId);

  if (!result.ok) {
    redirect(`/hasil/${sourceAttemptId}?error=${encodeURIComponent(result.reason)}`);
  }

  redirect(`/latihan/${result.attemptId}`);
}

/** Membatalkan percobaan yang masih berjalan (mis. siswa keluar di tengah misi). */
export async function cancelAttemptAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/masuk");

  const attemptId = String(formData.get("attemptId") ?? "");
  try {
    await cancelAttempt({ userId: session.id, role: "student" }, session.id, attemptId);
  } catch (error) {
    console.error("cancelAttemptAction", error);
    redirect("/progres?error=" + encodeURIComponent("Percobaan gagal dibatalkan. Coba lagi."));
  }

  revalidatePath("/progres");
  revalidatePath("/belajar");
  redirect("/progres?dibatalkan=1");
}

export type ProfileState = { error?: string; success?: string } | null;

export type ClassState = { error?: string; success?: string } | null;

/** Gabung kelas belajar dengan kode undangan; akun & progres tetap sama. */
export async function joinClassAction(_prev: ClassState, formData: FormData): Promise<ClassState> {
  const session = await getSession();
  if (!session || session.role !== "student") return { error: "Sesi kamu sudah berakhir." };

  const parsed = joinClassSchema.safeParse({ code: formData.get("code") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kode kelas belum valid." };

  const limited = rateLimit(`join-class:${session.id}`, 8, 10 * 60 * 1000);
  if (!limited.ok) {
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${limited.retryAfterSeconds} detik.` };
  }

  try {
    const result = await joinClassWithCode({ userId: session.id, role: "student" }, parsed.data.code);

    const messages: Record<string, string> = {
      SUDAH_TERGABUNG: "Kamu sudah menjadi anggota kelas ini.",
      KODE_TIDAK_DITEMUKAN: "Kode kelas tidak ditemukan. Periksa lagi huruf dan angkanya.",
      TINGKAT_TIDAK_COCOK: `Kelas "${result.className ?? "-"}" untuk Kelas ${result.gradeLevel ?? "-"} SD, sedangkan tingkat kelasmu berbeda.`,
      TERLALU_BANYAK_PERCOBAAN: "Terlalu banyak percobaan kode. Coba lagi beberapa menit lagi.",
      BUKAN_SISWA: "Hanya akun siswa yang dapat bergabung ke kelas.",
    };

    if (result.status !== "BERHASIL" && result.status !== "SUDAH_TERGABUNG") {
      return { error: messages[result.status] ?? "Kelas gagal dimasuki. Coba lagi." };
    }

    revalidatePath("/kelas-saya");
    revalidatePath("/belajar");
    revalidatePath("/progres");

    return {
      success:
        result.status === "SUDAH_TERGABUNG"
          ? messages.SUDAH_TERGABUNG
          : `Kamu bergabung ke ${result.className ?? "kelas"}${result.teacherName ? ` (guru: ${result.teacherName})` : ""}.`,
    };
  } catch (error) {
    console.error("joinClassAction", error);
    return { error: "Kelas gagal dimasuki. Periksa koneksi lalu coba lagi." };
  }
}

/** Menyimpan tingkat kelas siswa (untuk belajar mandiri). */
export async function setGradeAction(_prev: ClassState, formData: FormData): Promise<ClassState> {
  const session = await getSession();
  if (!session || session.role !== "student") return { error: "Sesi kamu sudah berakhir." };

  const parsed = studentGradeSchema.safeParse({ gradeLevel: formData.get("gradeLevel") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Tingkat kelas belum valid." };

  try {
    await setStudentGrade({ userId: session.id, role: "student" }, session.id, parsed.data.gradeLevel);
    revalidatePath("/kelas-saya");
    revalidatePath("/belajar");
    revalidatePath("/progres");
    return { success: "Tingkat kelas tersimpan. Misi sesuai tingkatmu akan muncul di peta misi." };
  } catch {
    return { error: "Tingkat kelas gagal disimpan. Coba lagi." };
  }
}

/** Keluar dari kelas (keanggotaan saja; akun, progres, dan riwayat tetap). */
export async function leaveClassAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  if (session.role !== "student") redirect("/guru/dashboard");

  const classId = String(formData.get("classId") ?? "").trim();
  if (!classId) redirect("/kelas-saya");

  try {
    await leaveClass({ userId: session.id, role: "student" }, session.id, classId);
  } catch (error) {
    console.error("leaveClassAction", error);
  }

  revalidatePath("/kelas-saya");
  revalidatePath("/belajar");
  revalidatePath("/progres");
  redirect("/kelas-saya?keluar=1");
}

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session || session.role !== "student") return { error: "Sesi kamu sudah berakhir." };

  const parsed = profileUpdateSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    avatarKey: formData.get("avatarKey") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data belum valid." };

  try {
    await updateStudentProfile({ userId: session.id, role: "student" }, session.id, parsed.data);
    revalidatePath("/belajar");
    revalidatePath("/progres");
    return { success: "Profil berhasil diperbarui." };
  } catch {
    return { error: "Profil gagal diperbarui. Coba lagi." };
  }
}
