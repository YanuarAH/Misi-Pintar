"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/session";
import { classSchema, classSubjectSchema, firstIssue, missionSchema, pinSchema } from "@/lib/validation";
import {
  TeacherError,
  archiveClass,
  archiveMission,
  archiveQuestion,
  deleteMission,
  restoreMission,
  createClass,
  createMission,
  createQuestion,
  deleteClass,
  regenerateJoinCode,
  removeClassMember,
  resetStudentPin,
  restoreClass,
  setClassGrade,
  setClassSubject,
  setMissionPublished,
  updateMission,
  updateQuestion,
} from "@/server/teacher";
import { MediaError, validateImageBytes } from "@/lib/mediaStore";
import { attachQuestionImage, detachQuestionImage } from "@/server/media";

async function teacherSession(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.role === "teacher" ? session : null;
}

function viewerFor(session: SessionUser) {
  return { userId: session.id, role: "teacher" as const };
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export type ActionState = { error?: string; success?: string } | null;

/* ---------------------------------- Misi --------------------------------- */

export async function saveMissionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await teacherSession();
  if (!session) return { error: "Sesi guru berakhir. Silakan masuk lagi." };

  const missionId = String(formData.get("missionId") ?? "");
  const parsed = missionSchema.safeParse({
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    story: formData.get("story") ?? "",
    learningObjectives: String(formData.get("learningObjectives") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    orderIndex: formData.get("orderIndex") ?? 1,
    gradeLevel: formData.get("gradeLevel") ?? "",
    subject: formData.get("subject") ?? "",
    topic: formData.get("topic") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  let newMissionId: string | null = null;
  try {
    if (missionId) {
      await updateMission(viewerFor(session), missionId, parsed.data);
    } else {
      const mission = await createMission(viewerFor(session), session.id, parsed.data);
      newMissionId = mission.id;
    }
  } catch (error) {
    if (error instanceof TeacherError) return { error: error.message };
    console.error("saveMissionAction", error);
    return { error: "Misi gagal disimpan. Coba lagi." };
  }

  revalidatePath("/guru/misi");
  if (missionId) revalidatePath(`/guru/misi/${missionId}`);
  revalidatePath("/belajar");

  if (newMissionId) redirect(`/guru/misi/${newMissionId}`);
  return { success: "Perubahan misi tersimpan." };
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const missionId = String(formData.get("missionId") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";

  try {
    await setMissionPublished(viewerFor(session), missionId, publish);
  } catch (error) {
    const message = error instanceof TeacherError ? error.message : "Status misi gagal diubah.";
    redirectWithError(`/guru/misi/${missionId}`, message);
  }

  revalidatePath("/guru/misi");
  revalidatePath(`/guru/misi/${missionId}`);
  revalidatePath("/belajar");
  redirect(`/guru/misi/${missionId}`);
}

export async function archiveMissionAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const missionId = String(formData.get("missionId") ?? "");
  try {
    await archiveMission(viewerFor(session), missionId);
  } catch (error) {
    redirectWithError(`/guru/misi/${missionId}`, error instanceof TeacherError ? error.message : "Misi gagal diarsipkan.");
  }

  revalidatePath("/guru/misi");
  revalidatePath("/belajar");
  redirect("/guru/misi");
}

export async function restoreMissionAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const missionId = String(formData.get("missionId") ?? "");
  try {
    await restoreMission(viewerFor(session), missionId);
  } catch (error) {
    redirectWithError(
      "/guru/misi?status=archived",
      error instanceof TeacherError ? error.message : "Misi gagal dipulihkan.",
    );
  }

  revalidatePath("/guru/misi");
  revalidatePath("/belajar");
  redirect("/guru/misi?status=archived&pesan=pulih");
}

export async function deleteMissionAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const missionId = String(formData.get("missionId") ?? "");
  try {
    await deleteMission(viewerFor(session), missionId);
  } catch (error) {
    redirectWithError(
      "/guru/misi?status=archived",
      error instanceof TeacherError ? error.message : "Misi gagal dihapus.",
    );
  }

  revalidatePath("/guru/misi");
  revalidatePath("/belajar");
  redirect("/guru/misi?status=archived&pesan=hapus");
}

/* --------------------------------- Soal ---------------------------------- */

export async function saveQuestionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await teacherSession();
  if (!session) return { error: "Sesi guru berakhir. Silakan masuk lagi." };

  const missionId = String(formData.get("missionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  if (!missionId) return { error: "Misi tidak dikenali." };

  const payload = {
    questionType: String(formData.get("questionType") ?? "multiple_choice"),
    prompt: String(formData.get("prompt") ?? ""),
    options: formData.getAll("option").map((value) => String(value)),
    correctAnswer: String(formData.get("correctAnswer") ?? ""),
    explanation: String(formData.get("explanation") ?? ""),
    hint: String(formData.get("hint") ?? ""),
    difficulty: String(formData.get("difficulty") ?? "sedang"),
    orderIndex: formData.get("orderIndex") ?? 1,
    topic: String(formData.get("topic") ?? "umum"),
    slotIndex: formData.get("slotIndex") ?? undefined,
  };

  // Validasi gambar lebih dulu supaya unggahan yang tidak sah tidak menyimpan soal setengah jadi.
  const imageField = formData.get("image");
  const imageFile = imageField instanceof File && imageField.size > 0 ? imageField : null;
  const removeImage = String(formData.get("removeImage") ?? "") === "1";

  if (imageFile) {
    try {
      validateImageBytes(new Uint8Array(await imageFile.arrayBuffer()));
    } catch (error) {
      return { error: error instanceof MediaError ? error.message : "Gambar tidak valid." };
    }
  }

  let saved: Awaited<ReturnType<typeof createQuestion>>;
  try {
    saved = questionId
      ? await updateQuestion(viewerFor(session), questionId, payload)
      : await createQuestion(viewerFor(session), missionId, payload);
  } catch (error) {
    if (error instanceof TeacherError) return { error: error.message };
    console.error("saveQuestionAction", error);
    return { error: "Soal gagal disimpan. Coba lagi." };
  }

  try {
    if (imageFile) {
      await attachQuestionImage(viewerFor(session), saved.id, imageFile);
    } else if (removeImage && questionId) {
      await detachQuestionImage(viewerFor(session), questionId);
    }
  } catch (error) {
    const message =
      error instanceof MediaError
        ? `Soal tersimpan, tetapi gambar gagal: ${error.message}`
        : "Soal tersimpan, tetapi gambar gagal diunggah. Coba lagi.";
    console.error("saveQuestionAction image", error);
    revalidatePath(`/guru/misi/${missionId}`);
    return { error: message };
  }

  revalidatePath(`/guru/misi/${missionId}`);
  revalidatePath("/guru/misi");
  return { success: questionId ? "Soal diperbarui." : "Soal ditambahkan." };
}

export async function archiveClassAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  if (!classId) redirectWithError("/guru/kelas", "Kelas tidak dikenali.");

  try {
    await archiveClass(viewerFor(session), classId);
  } catch (error) {
    const message = error instanceof TeacherError ? error.message : "Kelas gagal diarsipkan.";
    redirectWithError("/guru/kelas", message);
  }

  revalidatePath("/guru/kelas");
  revalidatePath(`/guru/kelas/${classId}`);
  revalidatePath("/belajar");
  redirect("/guru/kelas?pesan=arsip");
}

export async function restoreClassAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  if (!classId) redirectWithError("/guru/kelas", "Kelas tidak dikenali.");

  try {
    await restoreClass(viewerFor(session), classId);
  } catch (error) {
    const message = error instanceof TeacherError ? error.message : "Kelas gagal dipulihkan.";
    redirectWithError("/guru/kelas", message);
  }

  revalidatePath("/guru/kelas");
  revalidatePath(`/guru/kelas/${classId}`);
  revalidatePath("/belajar");
  redirect("/guru/kelas?pesan=pulih");
}

export async function deleteClassAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  if (!classId) redirectWithError("/guru/kelas", "Kelas tidak dikenali.");

  try {
    await deleteClass(viewerFor(session), classId, session.id);
  } catch (error) {
    const message = error instanceof TeacherError ? error.message : "Kelas gagal dihapus.";
    redirectWithError("/guru/kelas", message);
  }

  revalidatePath("/guru/kelas");
  revalidatePath("/belajar");
  redirect("/guru/kelas?pesan=hapus");
}

export async function archiveQuestionAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const missionId = String(formData.get("missionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  try {
    await archiveQuestion(viewerFor(session), questionId);
  } catch (error) {
    redirectWithError(
      `/guru/misi/${missionId}`,
      error instanceof TeacherError ? error.message : "Soal gagal dihapus.",
    );
  }

  revalidatePath(`/guru/misi/${missionId}`);
  revalidatePath("/guru/misi");
  redirect(`/guru/misi/${missionId}`);
}

/* --------------------------------- Kelas --------------------------------- */

export async function createClassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await teacherSession();
  if (!session) return { error: "Sesi guru berakhir." };

  const parsed = classSchema.safeParse({
    name: formData.get("name") ?? "",
    gradeLevel: formData.get("gradeLevel") ?? "",
    subject: formData.get("subject") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await createClass(viewerFor(session), session.id, parsed.data.name, parsed.data.gradeLevel, parsed.data.subject);
  } catch (error) {
    console.error("createClassAction", error);
    return { error: error instanceof TeacherError ? error.message : "Kelas gagal dibuat." };
  }

  revalidatePath("/guru/kelas");
  revalidatePath("/guru/dashboard");
  return { success: "Kelas baru dibuat. Bagikan kode kelas kepada siswa." };
}

/** Mengatur/mengubah tingkat kelas dari kelas belajar (termasuk kelas lama). */
export async function setClassGradeAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  const gradeLevel = Number(formData.get("gradeLevel") ?? 0);

  try {
    await setClassGrade(viewerFor(session), classId, gradeLevel);
  } catch (error) {
    const message = error instanceof TeacherError ? error.message : "Tingkat kelas gagal disimpan.";
    redirectWithError(`/guru/kelas/${classId}`, message);
  }

  revalidatePath(`/guru/kelas/${classId}`);
  revalidatePath("/guru/kelas");
  revalidatePath("/belajar");
  redirect(`/guru/kelas/${classId}?kelasDiatur=1`);
}

export async function setClassSubjectAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  const parsed = classSubjectSchema.safeParse(formData.get("subject") ?? "");
  if (!parsed.success) redirectWithError(`/guru/kelas/${classId}`, firstIssue(parsed.error));

  try {
    await setClassSubject(viewerFor(session), classId, parsed.data);
  } catch (error) {
    const message = error instanceof TeacherError ? error.message : "Mata pelajaran kelas gagal disimpan.";
    redirectWithError(`/guru/kelas/${classId}`, message);
  }

  revalidatePath(`/guru/kelas/${classId}`);
  revalidatePath("/guru/kelas");
  revalidatePath("/belajar");
  revalidatePath("/kelas-saya");
  redirect(`/guru/kelas/${classId}?mapelDiatur=1`);
}

export async function regenerateJoinCodeAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  try {
    await regenerateJoinCode(viewerFor(session), classId);
  } catch (error) {
    redirectWithError(`/guru/kelas/${classId}`, error instanceof TeacherError ? error.message : "Kode gagal diperbarui.");
  }

  revalidatePath(`/guru/kelas/${classId}`);
  redirect(`/guru/kelas/${classId}`);
}

export async function resetPinAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const parsed = pinSchema.safeParse(formData.get("pin") ?? "");

  if (!parsed.success) {
    redirectWithError(`/guru/kelas/${classId}`, "PIN baru harus 4–6 angka.");
  }

  try {
    await resetStudentPin(viewerFor(session), studentId, parsed.data);
  } catch (error) {
    redirectWithError(
      `/guru/kelas/${classId}`,
      error instanceof TeacherError || (error as { code?: string }).code === "42501"
        ? "Tidak berwenang mengubah PIN siswa ini."
        : "PIN gagal diatur ulang.",
    );
  }

  revalidatePath(`/guru/kelas/${classId}`);
  redirect(`/guru/kelas/${classId}?pinReset=1`);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const session = await teacherSession();
  if (!session) redirect("/guru/login");

  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  try {
    await removeClassMember(viewerFor(session), classId, studentId);
  } catch (error) {
    redirectWithError(`/guru/kelas/${classId}`, error instanceof TeacherError ? error.message : "Siswa gagal dikeluarkan.");
  }

  revalidatePath(`/guru/kelas/${classId}`);
  redirect(`/guru/kelas/${classId}`);
}
