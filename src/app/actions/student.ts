"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelAttempt,
  completeAttempt,
  startOrResumeAttempt,
  submitAnswer,
  updateStudentProfile,
} from "@/server/student";
import { getSession } from "@/lib/session";
import { profileUpdateSchema } from "@/lib/validation";
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
